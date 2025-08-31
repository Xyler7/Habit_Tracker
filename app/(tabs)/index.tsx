import { client, COMPLETIONS_COLLECTION_ID, DATABASE_ID, databases, HABITS_COLLECTION_ID, RealtimeResponse } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit, habitCompletions } from "@/types/database.type";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ID, Query } from "react-native-appwrite";
import { Swipeable } from "react-native-gesture-handler";
import { Button, Snackbar, Surface, Text } from "react-native-paper";



const Index: React.FC = () => {
  
  const {signOut, user} = useAuth();

  const [habits, setHabits] = useState<Habit[]>();
  const [completedHabits, setCompletedHabits] = useState<string[]>();

  const [deletedHabitBackup, setDeletedHabitBackup] = useState<{
  habit: Habit;
  completions: habitCompletions[];
} | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const swipeableRefs = useRef< {[key: string]: Swipeable | null} >({});

  const fetchTodayCompletions = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const response = await databases.listDocuments(
        DATABASE_ID,
        COMPLETIONS_COLLECTION_ID,
        [
          Query.equal("user_id", user?.$id ?? ""),
          Query.greaterThanEqual("completed_at", today.toISOString())]
      );
      const completions = response.documents as habitCompletions[];
      setCompletedHabits(completions.map((c) => c.habit_id));
    } catch (error) {
      console.error("Error fetching habits:", error);
    }
  }, [user]);


  const fetchHabits = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        HABITS_COLLECTION_ID,
        [Query.equal("user_id", user?.$id ?? "")]
      );
      setHabits(response.documents as Habit[]);
    } catch (error) {
      console.error("Error fetching habits:", error);
    }
  }, [user]);


  useEffect(() => {   
    if(user) { 
    const habitsChannel = `databases.${DATABASE_ID}.collections.${HABITS_COLLECTION_ID}.documents`;
    const habitsSubscription = client.subscribe(
      habitsChannel,
      (response: RealtimeResponse) => {
        if(response.events.includes(
          "databases.*.collections.*.documents.*.create"
        )
      ) {
        fetchHabits();
      } else if (response.events.includes(
          "databases.*.collections.*.documents.*.update"
        )
      ) {
        fetchHabits();
      }
      else if (response.events.includes(
          "databases.*.collections.*.documents.*.delete"
        )
      ) {
        fetchHabits();
      }
      }
    );


     const completionsChannel = `databases.${DATABASE_ID}.collections.${COMPLETIONS_COLLECTION_ID}.documents`;
    const completionsSubscription = client.subscribe(
      completionsChannel,
      (response: RealtimeResponse) => {
        if(response.events.includes(
          "databases.*.collections.*.documents.*.create"
        )
      ) {
        fetchTodayCompletions();
      }
      }
    );


    fetchHabits();
    fetchTodayCompletions();
    
    return() => {
      habitsSubscription();
      completionsSubscription();
    };
  }
}, [user, fetchHabits, fetchTodayCompletions]);
    


  const handleDeleteHabit = async (habitId: string) => {
  try {
    const habit = habits?.find(h => h.$id === habitId);
    if (!habit) return;

    const completionsRes = await databases.listDocuments(
      DATABASE_ID,
      COMPLETIONS_COLLECTION_ID,
      [Query.equal("habit_id", habitId)]
    );
    const completions = completionsRes.documents as habitCompletions[];

    setDeletedHabitBackup({ habit, completions });

    for (const completion of completions) {
      await databases.deleteDocument(
        DATABASE_ID,
        COMPLETIONS_COLLECTION_ID,
        completion.$id
      );
    }

    await databases.deleteDocument(DATABASE_ID, HABITS_COLLECTION_ID, habitId);

    fetchHabits();
    fetchTodayCompletions();

    setSnackbarVisible(true);
  } catch (error) {
    console.error("❌ Error deleting habit and completions:", error);
  }
};

  const handleUndoDelete = async () => {
  if (!deletedHabitBackup || !user) return;

  try {
    const { habit, completions } = deletedHabitBackup;

    const cleanDocument = (doc: any) => {
      const {
        $id,
        $collectionId,
        $databaseId,
        $createdAt,
        $updatedAt,
        $permissions,
        $sequence,
        ...rest
      } = doc;
      return rest;
    };

    // Alışkanlığı geri ekle
    const newHabitId = ID.unique();
    await databases.createDocument(
      DATABASE_ID,
      HABITS_COLLECTION_ID,
      newHabitId,
      {
        ...cleanDocument(habit),
        user_id: user.$id,
      }
    );

    // Bugünün tarihi (YYYY-MM-DD formatında)
    const today = new Date().toISOString().split("T")[0];

    // Sadece bugünkü completion varsa geri ekle
    const todaysCompletion = completions.find((c) => {
      const completionDate = new Date(c.completed_at).toISOString().split("T")[0];
      return completionDate === today;
    });

    if (todaysCompletion) {
      await databases.createDocument(
        DATABASE_ID,
        COMPLETIONS_COLLECTION_ID,
        ID.unique(),
        {
          ...cleanDocument(todaysCompletion),
          user_id: user.$id,
          habit_id: newHabitId,
        }
      );
    }

    // UI güncelle
    fetchHabits();
    fetchTodayCompletions();
    setSnackbarVisible(false);
    setDeletedHabitBackup(null);

  } catch (error) {
    console.error("❌ Error restoring habit:", error);
  }
};

    const handleCompleteHabit = async (id: string) => {
      if(!user || completedHabits?.includes(id)) return;
      try {

        const currentDate = new Date().toISOString()
        await databases.createDocument(
          DATABASE_ID, 
          COMPLETIONS_COLLECTION_ID, 
          ID.unique(),
          {
            habit_id:id,
            user_id: user.$id,
            completed_at: currentDate
          }
        );
        const habit = habits?.find((h) => h.$id === id)
        if (!habit) return;

        await databases.updateDocument(DATABASE_ID, HABITS_COLLECTION_ID, id, {
          streak_count: habit.streak_count + 1,
          last_completed: new Date().toISOString()
        });
      } catch (error) {
        console.error(error);
      }
    };

  const isHabitCompleted = (habitID: string) =>
    completedHabits?.includes(habitID);

  const renderRightActions = (habitId: string) =>(
    <View style={styles.swipeActionRight}>
      {isHabitCompleted(habitId) ? <Text style={
        {
          color: "#ffba00", 
          fontWeight: "bold",
        }}> Completed! </Text>
      :( 
        <MaterialCommunityIcons 
        name="check-circle-outline"
        size= {32}
        color={"#ffba00"}
        />
      )}
    </View>
  );

  const renderLeftActions =() =>(
    <View style={styles.swipeActionLeft}>
      <MaterialCommunityIcons 
        name="trash-can-outline"
        size= {32}
        color={"#ffba00"}
      />
    </View>
  );
  
  


  return (
    <View
    style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}> Today&apos;s Habits</Text>
        <Button
          mode="text"
          onPress={signOut}
          icon={"logout"}
          >Sign Out
        </Button>
      </View>

    <ScrollView showsVerticalScrollIndicator={false}>
      {habits?.length === 0 ? (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          No habits yet. Add your first habit!
        </Text>
      </View>
      ) : (
        habits?.map((habit, key) => (
          <Swipeable ref={(ref) => {
            swipeableRefs.current[habit.$id] = ref
          }}
          key= {key}
          overshootLeft={false}
          overshootRight={false}
          renderLeftActions={renderLeftActions}
          renderRightActions={() =>renderRightActions(habit.$id)}
          onSwipeableOpen={(direction) => {
            if( direction === "left") {
              handleDeleteHabit(habit.$id);
            } else if (direction === "right") {
              handleCompleteHabit(habit.$id);
            }
            swipeableRefs.current[habit.$id]?.close();
          }}
          >
          <Surface style={[styles.card, isHabitCompleted(habit.$id) && styles.cardCompleted]} elevation={1}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}> { habit.title } </Text>
            <Text style={styles.cardDescription}> { habit.description } </Text>
            <View style={styles.cardFooter}>
              <View style={styles.streakBadge}>
                <MaterialCommunityIcons
                  name="fire"
                  size= {18}
                  color={"#ff9800"}
                />
                <Text style={styles.streakText}>
                  {habit.streak_count} day streak
                </Text>
              </View>
                <View style={styles.frequencyBadge}>
                  <Text style={styles.frequencyText}> {habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}</Text>
                </View>
            </View>
          </View>
      </Surface>
      </Swipeable>
        ))
      )}
    </ScrollView>
    <Snackbar
      visible={snackbarVisible}
      onDismiss={() => setSnackbarVisible(false)}
      action={{
        label: "Undo",
        onPress: handleUndoDelete,
      }}
      duration={5000}
    >
      Habit deleted
    </Snackbar>
    </View>
  );
}
export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    color: "#888",
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  cardCompleted: {
    backgroundColor: "#fae0aaff",
    opacity: 0.6,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardDescription: {
    color: "#666",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakText: {
    marginLeft: 4,
    color: "#ff9800",
  },
  frequencyBadge: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  frequencyText: {
    color: "#333",
  },
  swipeActionRight: {
    justifyContent: 'center',
    alignItems:"flex-end",
    flex:1,
    backgroundColor:"#8f028fff",
    borderRadius: 18,
    marginBottom: 18,
    marginTop:2,
    paddingRight:16
  },
  swipeActionLeft: {
    justifyContent: 'center',
    alignItems:"flex-start",
    flex:1,
    backgroundColor:"#e53935",
    borderRadius: 18,
    marginBottom: 18,
    marginTop:2,
    paddingLeft:16
  },
});
