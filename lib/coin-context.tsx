import React, { createContext, useContext, useState, useEffect } from "react";
import { databases, DATABASE_ID } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context"; 
import { Query } from "react-native-appwrite";

interface CoinContextType {
  coins: number;
  addCoins: (amount: number) => void;
}

const CoinContext = createContext<CoinContextType | undefined>(undefined);

export const CoinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCoins = async () => {
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          "user_coins",
          [Query.equal("user_id", user.$id)]
        );

        if (res.documents.length > 0) {
          setCoins(res.documents[0].coins);
        } else {
          await databases.createDocument(DATABASE_ID, "user_coins", user.$id, {
            user_id: user.$id,
            coins: 0,
          });
          setCoins(0);
        }
      } catch (err) {
        console.error("Error fetching coins:", err);
      }
    };

    fetchCoins();
  }, [user]);

  const addCoins = async (amount: number) => {
    if (!user) return;
    
    const newCoins = coins + amount;
    setCoins(newCoins);

    try {
      await databases.updateDocument(
        DATABASE_ID,
        "user_coins",
        user.$id,
        { coins: newCoins }
      );
    } catch (err) {
      console.error("Error updating coins:", err);
    }
  };

  return (
    <CoinContext.Provider value={{ coins, addCoins }}>
      {children}
    </CoinContext.Provider>
  );
};

// ✅ Hook export edilmeli
export const useCoins = () => {
  const context = useContext(CoinContext);
  if (!context) {
    throw new Error("useCoins must be used within a CoinProvider");
  }
  return context;
};
