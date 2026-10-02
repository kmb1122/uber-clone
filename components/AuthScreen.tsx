import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../auth/AuthContext";

type AuthMode = "signup" | "login";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const isSignUp = mode === "signup";
  const emailIsValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const canSubmit =
    emailIsValid &&
    password.length > 0 &&
    (!isSignUp || (firstName.trim().length > 0 && lastName.trim().length > 0));

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage("");
    setNotice("");
  };

  const submit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setNotice("");
    try {
      if (isSignUp) {
        const result = await signUp(
          firstName.trim(),
          lastName.trim(),
          email.trim().toLowerCase(),
          password,
        );
        if (result.error) {
          setErrorMessage(result.error);
        } else if (result.requiresEmailConfirmation) {
          setNotice("Check your email to confirm your account, then log in.");
        }
      } else {
        const result = await signIn(email.trim().toLowerCase(), password);
        if (result.error) setErrorMessage(result.error);
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow px-6 pb-8 pt-5"
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-10 text-center text-[32px] font-bold text-[#111111]">
            {isSignUp ? "Create Your Account" : "Log In"}
          </Text>

          <View className="gap-6">
            {isSignUp ? (
              <>
                <AuthField
                  label="First name"
                  placeholder="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  textContentType="givenName"
                />
                <AuthField
                  label="Last name"
                  placeholder="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  textContentType="familyName"
                />
              </>
            ) : null}
            <AuthField
              label="Email"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <AuthField
              label="Password"
              placeholder={
                isSignUp ? "Create a password" : "Enter your password"
              }
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              secureTextEntry
              textContentType={isSignUp ? "newPassword" : "password"}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
          </View>

          {errorMessage ? (
            <Text
              accessibilityRole="alert"
              className="mt-4 text-[14px] text-[#B42318]"
            >
              {errorMessage}
            </Text>
          ) : null}
          {notice ? (
            <Text
              accessibilityRole="alert"
              className="mt-4 text-[14px] text-[#26734D]"
            >
              {notice}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit || isSubmitting}
            onPress={() => void submit()}
            className={`mt-8 h-[64px] items-center justify-center rounded-[14px] ${canSubmit ? "bg-[#111111]" : "bg-[#858585]"}`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-[20px] font-semibold text-white">
                {isSignUp ? "Next" : "Log In"}
              </Text>
            )}
          </Pressable>

          <View className="mt-12 flex-row justify-center">
            <Text className="text-[17px] text-[#171717]">
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => changeMode(isSignUp ? "login" : "signup")}
            >
              <Text className="text-[17px] font-bold text-[#111111]">
                {isSignUp ? "Log In" : "Sign Up"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthField({
  label,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View>
      <Text className="mb-3 text-[18px] font-bold text-[#292929]">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#6D6D6D"
        className="h-[62px] rounded-[16px] bg-[#F0F0F0] px-4 text-[17px] text-[#171717]"
        {...inputProps}
      />
    </View>
  );
}
