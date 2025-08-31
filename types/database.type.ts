import { Models } from "react-native-appwrite";

export interface Habit extends Models.Document {
    user_id: string;
    title: string;
    description: string;
    frequency: string; // e.g., "daily", "weekly"
    streak_count: number;
    last_completed: string
    created_at: string; 
}

export interface habitCompletions extends Models.Document {
    habit_id: string;
    user_id: string;
    completed_at: string;
}