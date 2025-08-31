import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

function useAuthRedirect(user: any, isLoadingUser: boolean, segments: string[], router: any) {
  useEffect(() => {
    if (isLoadingUser) return;

    const inAuthGroup = segments?.[0] === "auth";

    if (!user && !inAuthGroup) {
      router.replace("/auth");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, isLoadingUser, segments, router]);
}

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoadingUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useAuthRedirect(user, isLoadingUser, segments, router);

  if (isLoadingUser) {
    return null; // Loading Spinner
  }

  return <>{children}</>;
}



export default function Root() {
    return (
      <GestureHandlerRootView style={{flex:1}}>
        <AuthProvider>
          <PaperProvider>
            <SafeAreaProvider>
              <RouteGuard>
                  <Stack> 
                    <Stack.Screen name="auth" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  </Stack>
              </RouteGuard>
            </SafeAreaProvider>
          </PaperProvider>
      </AuthProvider>
    </GestureHandlerRootView>
    );
}

