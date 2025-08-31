import React, { createContext, useContext, useEffect, useState } from "react";
import { ID, Models } from "react-native-appwrite";
import { account } from "./appwrite";

type AuthContextType = {
  user: Models.User<Models.Preferences> | null;
  isLoadingUser: boolean;
  signUp: (email: string, password: string) => Promise<string | Models.User<Models.Preferences>>;
  signIn: (email: string, password: string) => Promise<string | Models.User<Models.Preferences>>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  useEffect(() => {
    checkSessionAndFetchUser(); // uygulama açıldığında oturumu kontrol et
  }, []);

  const checkSessionAndFetchUser = async () => {
  try {
    const currentUser = await account.get(); // aktif oturum varsa döner
    setUser(currentUser);
  } catch (error) {
    setUser(null); // oturum yoksa null
  } finally {
    setIsLoadingUser(false);
  }
};

  const signUp = async (email: string, password: string) => {
    try {
      await account.create(ID.unique(), email, password);
      return await signIn(email, password); // başarılıysa otomatik giriş
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return "An error occurred during sign up.";
    }
  };

  const signIn = async (email: string, password: string) => {
  try {
    // Oturum varsa önce sil
    const current = await account.getSession("current").catch(() => null);
    if (current) {
      await account.deleteSession("current");
    }

    // Yeni oturum oluştur
    await account.createEmailPasswordSession(email, password);
    const currentUser = await account.get();
    setUser(currentUser);
    return currentUser;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return "An error occurred during sign in.";
  }
};




  const signOut = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoadingUser, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be inside of the AuthProvider");
  }
  return context;
}
