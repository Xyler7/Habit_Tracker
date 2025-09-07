import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from "expo-router";
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useCoins } from "@/lib/coin-context";

const username = "Xyler7"; 

export default function TabsLayout() {
    const { coins } = useCoins();
    
    return (
      <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#ffba00'},
        tabBarStyle:{
            backgroundColor: '#f5f5f5',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,           
        },
        tabBarActiveTintColor: '#ffab00',
        tabBarInactiveTintColor: '#666666',

        headerRight: () => (
      <View style={{ flexDirection: "row", alignItems: "center", marginRight: 18 }}>
        <Text style={{ color: "#fff", fontWeight: "bold", marginRight: 6, fontSize:18 }}>{coins} 🪙</Text>
      </View>
    )
    }}> 
        <Tabs.Screen name="index" options={
            {
                title: "Today's Tasks",
                tabBarIcon: ({ color, size }) =>
                <MaterialCommunityIcons
                    name="calendar-today"
                    size= { size }
                    color={ color }
                />
            }
        } />

        <Tabs.Screen name="streaks" options={
            {
                title: "Streaks",
                tabBarIcon: ({ color, size }) => <MaterialCommunityIcons
                name="chart-line"
                size= { size }
                color={ color }/>
            }
        } />

        <Tabs.Screen name="add-habit" options={
            {
                title: "Add Habit",
                tabBarIcon: ({ color, size }) => <MaterialCommunityIcons
                name="plus-circle"
                size= { size }
                color={ color }/>
            }
        } />

      </Tabs>
    );
}
