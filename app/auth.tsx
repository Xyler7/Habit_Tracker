import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";

export default function AuthScreen() {
    const [isSignUp, setIsSignUp] = useState<boolean>(false);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string | null>("");

    const theme = useTheme();
    const router = useRouter();

    const { signIn, signUp } = useAuth();

    const handleAuth = async () => {
        if (!email || !password) {
            setError("Email and password are required.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        if (email.indexOf("@") === -1) {
            setError("Please enter a valid email address.");
            return;
        }
        setError(null);

        if (isSignUp) {
            const result = await signUp(email, password);
            if (typeof result === "string") {
                setError(result);
                return;
            }
        } else {
            const result = await signIn(email, password);
            if (typeof result === "string") {
                setError(result);
                return;
            }
            setError(null); // giriş başarılı, hata yok
            router.replace("/");
        }
    };

    const handleSwitchMode = () => {
        setIsSignUp((prev) => !prev);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "android" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.content}>
                <Text style={styles.title} variant="headlineSmall">
                    {isSignUp ? "Create Account" : "Welcome Back!"}
                </Text>

                <TextInput
                    label="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="example@gmail.com"
                    mode="outlined"
                    style={styles.input}
                    onChangeText={setEmail}
                />

                <TextInput
                    label="Password"
                    autoCapitalize="none"
                    secureTextEntry={true}
                    mode="outlined"
                    style={styles.input}
                    onChangeText={setPassword}
                />

                {error && (
                    <Text style={{ color: theme.colors.error }}>{error}</Text>
                )}

                <Button
                    mode="contained"
                    style={styles.button}
                    onPress={handleAuth}
                >
                    {isSignUp ? "Sign Up" : "Sign In"}
                </Button>

                <Button
                    mode="text"
                    onPress={handleSwitchMode}
                    style={styles.switchModeButton}
                >
                    {isSignUp
                        ? "Already have an account? Sign In!"
                        : "Don't have an account? Sign Up!"}
                </Button>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 16,
        textAlign: "center",
    },
    input: {
        marginBottom: 6,
    },
    button: {
        textAlign: "center",
        marginTop: 8,
    },
    switchModeButton: {
        marginTop: 6,
    },
});
