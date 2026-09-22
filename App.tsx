import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "./global.css";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const icons = {
  home: require("./assets/icons/home.png"),
  list: require("./assets/icons/list.png"),
  map: require("./assets/icons/map.png"),
  profile: require("./assets/icons/profile.png"),
  search: require("./assets/icons/search.png"),
};

const suggestions = [
  { label: "Ride", icon: "🚘", badge: "30%" },
  { label: "Send Items", icon: "📦", badge: "30%" },
  { label: "Reserve", icon: "⏱", badge: "Promo" },
  { label: "Store Pickup", icon: "🛍", badge: "" },
];

const tabs = [
  { label: "Home", icon: "home" },
  { label: "Services", icon: "list" },
  { label: "Activity", icon: "map" },
  { label: "Account", icon: "profile" },
];

const cachedLocationKey = "ubar.cached-location";
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY;

type CachedLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

type PlaceSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Home");
  const [mode, setMode] = useState("Ride");
  const [plannerVisible, setPlannerVisible] = useState(false);
  const [destination, setDestination] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Locating you...");
  const [locationLoading, setLocationLoading] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>(
    [],
  );
  const [fontsLoaded] = useFonts({
    JakartaRegular: require("./assets/fonts/PlusJakartaSans-Regular.ttf"),
    JakartaMedium: require("./assets/fonts/PlusJakartaSans-Medium.ttf"),
    JakartaSemiBold: require("./assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    JakartaBold: require("./assets/fonts/PlusJakartaSans-Bold.ttf"),
  });

  useEffect(() => {
    if (!plannerVisible) return;

    let cancelled = false;
    let locationSubscription: Location.LocationSubscription | undefined;

    const resolveLocation = async (location: Location.LocationObject) => {
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        const place = places[0];
        const label =
          [place?.name, place?.district, place?.city]
            .filter(Boolean)
            .join(", ") || "Current location";
        const cached: CachedLocation = {
          label,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        await AsyncStorage.setItem(cachedLocationKey, JSON.stringify(cached));
        if (!cancelled) {
          setCurrentLocation(label);
          setLocationLoading(false);
        }
      } catch {
        if (!cancelled) setLocationLoading(false);
      }
    };

    const loadLocation = async () => {
      const cached = await AsyncStorage.getItem(cachedLocationKey);
      if (cached && !cancelled) {
        try {
          setCurrentLocation((JSON.parse(cached) as CachedLocation).label);
          setLocationLoading(false);
        } catch {
          await AsyncStorage.removeItem(cachedLocationKey);
        }
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        if (!cancelled && !cached) {
          setCurrentLocation("Location access is unavailable");
          setLocationLoading(false);
        }
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 100,
        },
        (location) => {
          void resolveLocation(location);
        },
      );
      if (cancelled) {
        subscription.remove();
      } else {
        locationSubscription = subscription;
      }
    };

    setLocationLoading(true);
    void loadLocation();
    return () => {
      cancelled = true;
      locationSubscription?.remove();
    };
  }, [plannerVisible]);

  useEffect(() => {
    if (!plannerVisible || destination.trim().length < 2) {
      setPlaceSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      if (!googleMapsApiKey) return;
      try {
        const response = await fetch(
          "https://places.googleapis.com/v1/places:autocomplete",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": googleMapsApiKey,
            },
            body: JSON.stringify({
              input: destination.trim(),
            }),
          },
        );
        const data = (await response.json()) as {
          suggestions?: PlaceSuggestion[];
        };
        setPlaceSuggestions(data.suggestions ?? []);
      } catch {
        setPlaceSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [destination, plannerVisible]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView className="flex-1 items-center bg-[#F4F4F4]">
      <StatusBar style="dark" />
      <View className="h-full w-full max-w-[375px] overflow-hidden rounded-[16px] border border-[#D7D7D7] bg-white">
        <View className="flex-1">
          <View className="h-[55px] flex-row items-center justify-center gap-6 border-b border-[#F0F0F0]">
            <Pressable
              accessibilityRole="tab"
              onPress={() => setMode("Ride")}
              className={`h-full flex-row items-center gap-2 border-b-2 px-2 ${mode === "Ride" ? "border-[#111111]" : "border-transparent"}`}
            >
              <Text className="text-[19px]">🚘</Text>
              <Text
                className={`font-jakarta-medium text-[15px] ${mode === "Ride" ? "font-jakarta-bold text-[#111111]" : "text-[#8A8A8A]"}`}
              >
                Ubar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              onPress={() => setMode("Courier")}
              className={`h-full flex-row items-center gap-2 border-b-2 px-2 ${mode === "Courier" ? "border-[#111111]" : "border-transparent"}`}
            >
              <Text className="text-[20px]">📦</Text>
              <Text
                className={`font-jakarta-medium text-[15px] ${mode === "Courier" ? "font-jakarta-bold text-[#111111]" : "text-[#8A8A8A]"}`}
              >
                Courier
              </Text>
            </Pressable>
          </View>

          {activeTab === "Home" ? (
            <ScrollView
              contentContainerClassName="px-3 pb-5"
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => setPlannerVisible(true)}
                className="mt-6 h-11 flex-row items-center rounded-[28px] border-[1.5px] border-[#252525] px-3"
              >
                <Image source={icons.search} className="h-[19px] w-[19px]" />
                <TextInput
                  editable={false}
                  placeholder="Where to?"
                  placeholderTextColor="#252525"
                  className="flex-1 px-2 font-jakarta-semibold text-[15px] text-[#252525]"
                />
                <View className="h-8 flex-row items-center gap-1 rounded-[20px] bg-[#F3F3F3] px-2.5">
                  <Text className="text-[18px] leading-[18px] text-[#202020]">
                    □
                  </Text>
                  <Text className="font-jakarta-semibold text-xs text-[#202020]">
                    Later
                  </Text>
                </View>
              </Pressable>

              <Text className="mt-5 font-jakarta-bold text-[17px] text-[#151515]">
                Suggestions
              </Text>
              <View className="mt-3 flex-row gap-2">
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion.label}
                    className="h-[85px] flex-1 items-center justify-end overflow-visible rounded-[9px] bg-[#F1F2F3] px-0.5 pb-2"
                  >
                    {suggestion.badge ? (
                      <View
                        className={`absolute -top-2 rounded-[3px] bg-[#E51B23] px-1 py-0.5 ${suggestion.badge === "Promo" ? "right-2.5" : "left-2.5"}`}
                      >
                        <Text className="font-jakarta-bold text-[8px] text-white">
                          {suggestion.badge === "Promo"
                            ? "Promo"
                            : `◆ ${suggestion.badge}`}
                        </Text>
                      </View>
                    ) : null}
                    <Text className="mb-2 text-[27px]">{suggestion.icon}</Text>
                    <Text
                      numberOfLines={1}
                      className="font-jakarta-medium text-[9px] text-[#202020]"
                    >
                      {suggestion.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable className="mt-[18px] h-[138px] flex-row overflow-hidden rounded-[10px] bg-[#1553C2]">
                <View className="flex-[1.18] justify-between p-[15px]">
                  <Text className="font-jakarta-bold text-[17px] leading-[23px] text-white">
                    Get same-day{`\n`}delivery
                  </Text>
                  <View className="self-start rounded-[18px] bg-white px-3 py-2">
                    <Text className="font-jakarta-bold text-[11px] text-[#262626]">
                      Try Courier
                    </Text>
                  </View>
                </View>
                <Image
                  source={require("./assets/images/signup-car.png")}
                  className="h-full flex-1"
                  resizeMode="cover"
                />
              </Pressable>

              <Text className="mt-[26px] font-jakarta-bold text-[17px] text-[#151515]">
                Deliver with Courier
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 pt-3"
              >
                <Image
                  source={require("./assets/images/onboarding1.png")}
                  className="h-[132px] w-[230px] rounded-lg"
                />
                <Image
                  source={require("./assets/images/onboarding2.png")}
                  className="h-[132px] w-[230px] rounded-lg"
                />
              </ScrollView>
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center pb-20">
              <Image
                source={
                  icons[
                    (tabs.find((tab) => tab.label === activeTab)?.icon ??
                      "home") as keyof typeof icons
                  ]
                }
                className="mb-3.5 h-[34px] w-[34px] opacity-75"
              />
              <Text className="font-jakarta-bold text-[22px] text-[#161616]">
                {activeTab}
              </Text>
              <Text className="mt-2 font-jakarta text-[13px] text-[#777777]">
                Your {activeTab.toLowerCase()} space is coming together.
              </Text>
            </View>
          )}

          <View className="flex-row items-start justify-around border-t border-[#F0F0F0] bg-white pb-2 pt-2">
            {tabs.map((tab) => {
              const isActive = tab.label === activeTab;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  key={tab.label}
                  onPress={() => setActiveTab(tab.label)}
                  className="w-1/4 items-center gap-1"
                >
                  <Image
                    source={icons[tab.icon as keyof typeof icons]}
                    className={`h-[21px] w-[21px]`}
                    style={{ tintColor: isActive ? "#202020" : "#9A9A9A" }}
                  />
                  <Text
                    className={`font-jakarta-medium text-[10px] ${isActive ? "font-jakarta-bold text-[#202020]" : "text-[#9A9A9A]"}`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setPlannerVisible(false)}
        presentationStyle="pageSheet"
        visible={plannerVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-white"
        >
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center border-b border-[#EEEEEE] px-5 pb-4 pt-2">
              <Pressable
                accessibilityLabel="Close ride planner"
                onPress={() => setPlannerVisible(false)}
                className="mr-5 h-9 w-9 items-start justify-center"
              >
                <Text className="text-[28px] leading-8 text-[#202020]">‹</Text>
              </Pressable>
              <Text className="font-jakarta-bold text-[17px] text-[#111111]">
                Plan your ride
              </Text>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="px-5 pb-10"
              showsVerticalScrollIndicator={false}
            >
              <View className="mt-4 flex-row gap-2">
                <View className="flex-row items-center rounded-[20px] bg-[#F2F2F2] px-3 py-2">
                  <Text className="mr-2 text-[14px] text-[#333333]">◷</Text>
                  <Text className="font-jakarta-semibold text-[11px] text-[#333333]">
                    Pickup now
                  </Text>
                  <Text className="ml-2 text-[#777777]">⌄</Text>
                </View>
                <View className="flex-row items-center rounded-[20px] bg-[#F2F2F2] px-3 py-2">
                  <Text className="mr-2 text-[14px] text-[#333333]">♙</Text>
                  <Text className="font-jakarta-semibold text-[11px] text-[#333333]">
                    For me
                  </Text>
                  <Text className="ml-2 text-[#777777]">⌄</Text>
                </View>
              </View>

              <View className="mt-3 overflow-hidden rounded-[10px] border-2 border-[#202020]">
                <View
                  pointerEvents="none"
                  className="absolute left-[18px] top-[36px] z-10 h-[34px] w-px bg-[#555555]"
                />
                <View className="min-h-[53px] flex-row items-center border-b border-[#DDDDDD] px-3">
                  <Text className="mr-3 text-[18px] text-[#111111]">●</Text>
                  <Text
                    className="flex-1 font-jakarta-medium text-[13px] text-[#333333]"
                    numberOfLines={1}
                  >
                    {currentLocation}
                  </Text>
                  {locationLoading ? (
                    <ActivityIndicator color="#202020" size="small" />
                  ) : null}
                </View>
                <View className="min-h-[53px] flex-row items-center px-3">
                  <Text className="mr-3 text-[18px] text-[#111111]">▣</Text>
                  <TextInput
                    autoFocus
                    onChangeText={setDestination}
                    placeholder="Where to?"
                    placeholderTextColor="#777777"
                    value={destination}
                    className="flex-1 font-jakarta-medium text-[13px] text-[#222222]"
                  />
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-[#E9E9E9]">
                    <Text className="text-[20px] leading-5 text-[#222222]">
                      +
                    </Text>
                  </View>
                </View>
              </View>

              {placeSuggestions.map((suggestion) => {
                const prediction = suggestion.placePrediction;
                const label = prediction?.text?.text;
                if (!label) return null;
                return (
                  <Pressable
                    key={prediction?.placeId ?? label}
                    onPress={() => setDestination(label)}
                    className="flex-row items-center border-b border-[#EEEEEE] py-4"
                  >
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#F0F0F0]">
                      <Text className="text-[15px] text-[#333333]">⌖</Text>
                    </View>
                    <Text className="flex-1 font-jakarta-medium text-[13px] text-[#222222]">
                      {label}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                accessibilityRole="button"
                onPress={() => setDestination("")}
                className="flex-row items-center border-b border-[#EEEEEE] py-4"
              >
                <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#F0F0F0]">
                  <Text className="text-[15px] text-[#333333]">🌐︎</Text>
                </View>
                <Text className="font-jakarta-semibold text-[13px] text-[#222222]">
                  Search in a different city
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                className="flex-row items-center border-b border-[#EEEEEE] py-4"
              >
                <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#F0F0F0]">
                  <Text className="text-[16px] text-[#333333]">𖤣</Text>
                </View>
                <Text className="font-jakarta-semibold text-[13px] text-[#222222]">
                  Set location on map
                </Text>
              </Pressable>

              {!googleMapsApiKey && destination.length > 1 ? (
                <Text className="mt-4 font-jakarta text-xs text-[#777777]">
                  Add EXPO_PUBLIC_GOOGLE_MAPS_APIKEY to .env to search
                  destinations.
                </Text>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
