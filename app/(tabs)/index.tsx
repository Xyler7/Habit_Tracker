import { client, COMPLETIONS_COLLECTION_ID, DATABASE_ID, databases, HABITS_COLLECTION_ID } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit, habitCompletions } from "@/types/database.type";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ID, Query } from "react-native-appwrite";
import { Swipeable } from "react-native-gesture-handler";
import { Button, Snackbar, Surface, Text } from "react-native-paper";
import { playSound } from "../../utils/sound";
import checked from "@/assets/sounds/checked.mp3";
import deleted from '@/assets/sounds/deleted.mp3';
import deny from '@/assets/sounds/deny.mp3';
import { useCoins } from "@/lib/coin-context";

export default function Index() {
  const { signOut, user } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [deletedBackup, setDeletedBackup] = useState<{
    habit: Habit;
    completions: habitCompletions[];
  } | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const { addCoins } = useCoins();
  const swipeRefs = useRef<{ [k: string]: Swipeable | null }>({});

  // 1) Tüm habit’leri çek
  const fetchHabits = useCallback(async () => {
    if (!user) return;
    const res = await databases.listDocuments(
      DATABASE_ID,
      HABITS_COLLECTION_ID,
      [Query.equal("user_id", user.$id)]
    );
    setHabits(res.documents as unknown as Habit[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const chan = `databases.${DATABASE_ID}.collections.${HABITS_COLLECTION_ID}.documents`;
    const unsub = client.subscribe(chan, fetchHabits);
    fetchHabits();
    return () => unsub();
  }, [user, fetchHabits]);

  // 2) Lock kontrolü: last_completed null ise false, doluysa frekansa göre
  const isHabitLocked = (habit: Habit) => {
    // Henüz hiç tamamlanmamışsa kilit yok
    if (habit.streak_count === 0) return false;

    // Son tamamlama tarihi yoksa da kilit yok
    if (!habit.last_completed) return false;

    const last = new Date(habit.last_completed).getTime();
    const now = Date.now();
    let lockDays = 1;

    if (habit.frequency === "weekly") lockDays = 7;
    if (habit.frequency === "monthly") lockDays = 30;

    const diffDays = (now - last) / (1000 * 60 * 60 * 24);
    return diffDays < lockDays;
  };


  // 3) Sağa kaydırınca tamamla
  const handleComplete = async (habit: Habit) => {
    if (!user) return;
    if (isHabitLocked(habit)) {
      playSound(deny);
      return;
    }
    try {
      const now = new Date().toISOString();
      await databases.createDocument(
        DATABASE_ID,
        COMPLETIONS_COLLECTION_ID,
        ID.unique(),
        { habit_id: habit.$id, user_id: user.$id, completed_at: now }
      );
      await databases.updateDocument(
        DATABASE_ID,
        HABITS_COLLECTION_ID,
        habit.$id,
        {
          streak_count: habit.streak_count + 1,
          last_completed: now,
        }
      );
      // coin miktarı frekansa göre
      if (habit.frequency === "weekly") addCoins(10);
      else if (habit.frequency === "monthly") addCoins(20);
      else addCoins(5);
      playSound(checked);
    } catch (e) {
      console.error(e);
    } finally {
      fetchHabits();
    }
  };

  // 4) Sola kaydırınca sil
  const handleDelete = async (habit: Habit) => {
    if (!user) return;
    // backup
    const compRes = await databases.listDocuments(
      DATABASE_ID,
      COMPLETIONS_COLLECTION_ID,
      [Query.equal("habit_id", habit.$id)]
    );
    const comps = (compRes.documents as any).map((d: habitCompletions): habitCompletions => ({
      ...d,
      habit_id: d.habit_id,
      user_id: d.user_id,
      completed_at: d.completed_at,
    }));
    setDeletedBackup({ habit, completions: comps });
    // sil
    await Promise.all(
      comps.map((c: { $id: string; }) =>
        databases.deleteDocument(
          DATABASE_ID,
          COMPLETIONS_COLLECTION_ID,
          c.$id
        )
      )
    );
    await databases.deleteDocument(
      DATABASE_ID,
      HABITS_COLLECTION_ID,
      habit.$id
    );
    fetchHabits();
    setSnackbarVisible(true);
    playSound(deleted);
  };

  // 5) Undo
  const handleUndo = async () => {
    if (!user || !deletedBackup) return;
    const { habit, completions } = deletedBackup;
    const newHabitId = ID.unique();
    const clean = (d: any) => {
      const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, ...rest } = d;
      return rest;
    };
    await databases.createDocument(
      DATABASE_ID,
      HABITS_COLLECTION_ID,
      newHabitId,
      { ...clean(habit), user_id: user.$id }
    );
    const today = new Date().toISOString().split("T")[0];
    const todayComp = completions.find((c) =>
      c.completed_at.split("T")[0] === today
    );
    if (todayComp) {
      await databases.createDocument(
        DATABASE_ID,
        COMPLETIONS_COLLECTION_ID,
        ID.unique(),
        { ...clean(todayComp), habit_id: newHabitId, user_id: user.$id }
      );
    }
    fetchHabits();
    setDeletedBackup(null);
    setSnackbarVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button icon="logout" onPress={signOut}>
          Sign Out
        </Button>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {habits.length === 0 && (
          <View style={styles.empty}>
            <Text>No habits yet. Add your first one!</Text>
          </View>
        )}
        {habits.map((h) => (
          <Swipeable
            key={h.$id}
            ref={(r) => { swipeRefs.current[h.$id] = r; }}
            overshootLeft={false}
            overshootRight={false}
            renderLeftActions={() => (
              <View style={styles.leftAction}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={32}
                  color="#8f028fff"
                />
              </View>
            )}
            renderRightActions={() => (
              <View style={styles.rightAction}>
                {isHabitLocked(h) ? (
                  <Text style={styles.lockedText}>Completed</Text>
                ) : (
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={32}
                    color="#ffba00"
                  />
                )}
              </View>
            )}
            onSwipeableOpen={(dir) => {
              if (dir === "left") handleDelete(h);
              else handleComplete(h);
              swipeRefs.current[h.$id]?.close();
            }}
          >
            <Surface
              style={[
                styles.card,
                isHabitLocked(h) && styles.cardLocked,
              ]}
              elevation={1}
            >
              <View style={styles.content}>
                <Text variant="titleMedium">{h.title}</Text>
                <Text>{h.description}</Text>
                <View style={styles.footer}>
                  <View style={styles.badge}>
                    <MaterialCommunityIcons
                      name="fire"
                      size={18}
                      color="#ff9800"
                    />
                    <Text>{h.streak_count} day streak</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text>{h.frequency.charAt(0).toUpperCase() + h.frequency.slice(1)}</Text>
                  </View>
                </View>
              </View>
            </Surface>
          </Swipeable>
        ))}
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        action={{ label: "Undo", onPress: handleUndo }}
        duration={5000}
      >
        Habit deleted
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 8,
  },
  empty: { alignItems: "center", marginTop: 64 },
  leftAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 8,
    backgroundColor: "#ffba00",
  },
  rightAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 8,
    backgroundColor: "#8f028fff",
  },
  lockedText: { color: "#ffba00", fontWeight: "700" },
  card: {
    margin: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  cardLocked: { opacity: 0.6 },
  content: { padding: 16 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  badge: {
    color: "#666",
    flexDirection: "row",
    alignItems: "center",
  },
});
