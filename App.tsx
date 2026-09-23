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

type RoutePlan = {
  destination: string;
  mapUrl?: string;
  duration: string;
  distance: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Home");
  const [mode, setMode] = useState("Ride");
  const [plannerVisible, setPlannerVisible] = useState(false);
  const [destination, setDestination] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Locating you...");
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState<
    { latitude: number; longitude: number } | undefined
  >();
  const [routePlan, setRoutePlan] = useState<RoutePlan | undefined>();
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PlaceSuggestion>();
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
          setCurrentCoordinates({
            latitude: cached.latitude,
            longitude: cached.longitude,
          });
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
          const cachedLocation = JSON.parse(cached) as CachedLocation;
          setCurrentLocation(cachedLocation.label);
          setCurrentCoordinates({
            latitude: cachedLocation.latitude,
            longitude: cachedLocation.longitude,
          });
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

  const showRoutePlan = (plan: RoutePlan) => {
    setPlannerVisible(false);
    setTimeout(() => setRoutePlan(plan), 300);
  };

  const selectDestination = async (suggestion: PlaceSuggestion) => {
    const prediction = suggestion.placePrediction;
    const placeId = prediction?.placeId;
    const label = prediction?.text?.text;
    if (!placeId || !label) return;

    setDestination(label);
    setRouteLoading(true);

    try {
      const placeResponse = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            "X-Goog-Api-Key": googleMapsApiKey ?? "",
            "X-Goog-FieldMask": "location,formattedAddress,displayName",
          },
        },
      );
      const place = (await placeResponse.json()) as {
        location?: { latitude?: number; longitude?: number };
        formattedAddress?: string;
        displayName?: { text?: string };
      };
      const destinationCoordinates = place.location;
      const origin = currentCoordinates;

      if (
        !origin ||
        !destinationCoordinates?.latitude ||
        !destinationCoordinates.longitude
      ) {
        throw new Error("Route coordinates are unavailable");
      }

      const directionsUrl = new URL(
        "https://maps.googleapis.com/maps/api/directions/json",
      );
      directionsUrl.searchParams.set(
        "origin",
        `${origin.latitude},${origin.longitude}`,
      );
      directionsUrl.searchParams.set(
        "destination",
        `${destinationCoordinates.latitude},${destinationCoordinates.longitude}`,
      );
      directionsUrl.searchParams.set("mode", "driving");
      directionsUrl.searchParams.set("key", googleMapsApiKey ?? "");
      const directionsResponse = await fetch(directionsUrl.toString());
      const directions = (await directionsResponse.json()) as {
        routes?: Array<{
          overview_polyline?: { points?: string };
          legs?: Array<{
            distance?: { text?: string };
            duration?: { text?: string };
          }>;
        }>;
      };
      const route = directions.routes?.[0];
      const leg = route?.legs?.[0];
      const encodedPath = route?.overview_polyline?.points;
      const mapUrl = encodedPath
        ? `https://maps.googleapis.com/maps/api/staticmap?size=750x520&scale=2&maptype=roadmap&markers=color:black%7Clabel:A%7C${origin.latitude},${origin.longitude}&markers=color:red%7Clabel:B%7C${destinationCoordinates.latitude},${destinationCoordinates.longitude}&path=color:0x252525%7Cweight:5%7Cenc:${encodeURIComponent(encodedPath)}&key=${googleMapsApiKey ?? ""}`
        : undefined;

      showRoutePlan({
        destination: place.formattedAddress ?? place.displayName?.text ?? label,
        mapUrl,
        distance: leg?.distance?.text ?? "8.5 km",
        duration: leg?.duration?.text ?? "9 min",
      });
    } catch {
      showRoutePlan({
        destination: label,
        distance: "8.5 km",
        duration: "9 min",
      });
    } finally {
      setRouteLoading(false);
    }
  };

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
                <Text className="flex-1 px-2 font-jakarta-semibold text-[15px] text-[#252525]">
                  Where to?
                </Text>
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
                    onChangeText={(text) => {
                      setDestination(text);
                      setSelectedSuggestion(undefined);
                    }}
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

              {selectedSuggestion ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={routeLoading}
                  onPress={() => void selectDestination(selectedSuggestion)}
                  className={`mt-3 h-12 items-center justify-center rounded-lg bg-black ${routeLoading ? "opacity-60" : ""}`}
                >
                  {routeLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-jakarta-bold text-[14px] text-white">
                      Find a ride
                    </Text>
                  )}
                </Pressable>
              ) : null}

              {placeSuggestions.map((suggestion) => {
                const prediction = suggestion.placePrediction;
                const label = prediction?.text?.text;
                if (!label) return null;
                return (
                  <Pressable
                    key={prediction?.placeId ?? label}
                    disabled={routeLoading}
                    onPress={() => {
                      const selectedLabel = prediction?.text?.text;
                      if (selectedLabel) {
                        setDestination(selectedLabel);
                        setSelectedSuggestion(suggestion);
                        setPlaceSuggestions([]);
                      }
                    }}
                    className="flex-row items-center border-b border-[#EEEEEE] py-4"
                  >
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#F0F0F0]">
                      <Text className="text-[15px] text-[#333333]">⌖</Text>
                    </View>
                    <Text className="flex-1 font-jakarta-medium text-[13px] text-[#222222]">
                      {label}
                    </Text>
                    {routeLoading ? (
                      <ActivityIndicator color="#222222" size="small" />
                    ) : null}
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

      <Modal
        animationType="slide"
        onRequestClose={() => setRoutePlan(undefined)}
        visible={Boolean(routePlan)}
      >
        <SafeAreaView className="flex-1 bg-[#E8EDF1]">
          <View className="relative flex-1">
            {routePlan?.mapUrl ? (
              <Image
                source={{ uri: routePlan.mapUrl }}
                className="absolute inset-0"
                resizeMode="cover"
              />
            ) : (
              <View className="absolute inset-0 items-center justify-center bg-[#DCE4EA]">
                <Text className="font-jakarta-medium text-xs text-[#59656D]">
                  Google route map unavailable
                </Text>
              </View>
            )}

            <Pressable
              accessibilityLabel="Back to destination search"
              onPress={() => setRoutePlan(undefined)}
              className="absolute left-4 top-3 h-10 w-10 items-center justify-center rounded-full bg-white shadow"
            >
              <Text className="text-[28px] leading-8 text-[#202020]">‹</Text>
            </Pressable>

            <View className="absolute left-4 right-4 top-[30%] gap-2">
              <View className="self-start rounded-md bg-white px-3 py-2 shadow">
                <Text className="font-jakarta-bold text-xs text-[#222222]">
                  {routePlan?.destination}
                </Text>
                <Text className="font-jakarta text-[10px] text-[#666666]">
                  {routePlan?.distance} · {routePlan?.duration}
                </Text>
              </View>
            </View>

            <View className="absolute inset-x-0 bottom-0 h-[40%] rounded-t-[22px] bg-white px-4 pb-3 pt-4 shadow-lg">
              <Text className="mb-3 text-center font-jakarta-bold text-[17px] text-[#111111]">
                Choose a ride
              </Text>

              <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-2"
              >
                <Pressable className="mb-1 flex-row items-center rounded-[10px] border-2 border-[#111111] px-3 py-2.5">
                  <Image
                    source={require("./assets/images/signup-car.png")}
                    className="mr-3 h-10 w-[58px]"
                    resizeMode="contain"
                  />
                  <View className="flex-1">
                    <Text className="font-jakarta-bold text-[14px] text-[#222222]">
                      ⚡ Priority · 4
                    </Text>
                    <Text className="font-jakarta text-xs text-[#333333]">
                      6:46 PM · {routePlan?.duration}
                    </Text>
                    <Text className="mt-1 self-start rounded bg-[#2E72D2] px-2 py-1 font-jakarta-bold text-[10px] text-white">
                      ⚡ Faster
                    </Text>
                  </View>
                  <Text className="font-jakarta-bold text-[14px] text-[#222222]">
                    NGN 10,800.00
                  </Text>
                </Pressable>

                <RideOption
                  imageSource={require("./assets/images/signup-car.png")}
                  name="UberX"
                  price="NGN 9,400.00"
                  time="6:47 PM · 11 min"
                />
                <RideOption
                  icon="📦"
                  name="Courier"
                  price="NGN 2,800.00"
                  time="6:43 PM · 6 min"
                  oldPrice="NGN 4,000.00"
                />
                <RideOption
                  imageSource={require("./assets/images/signup-car.png")}
                  name="Wait & Save"
                  price="NGN 8,800.00"
                  time="6:50 PM · 12 min"
                />
              </ScrollView>

              <View className="flex-row items-center border-t border-[#EEEEEE] py-2">
                <View className="mr-3 h-5 w-5 items-center justify-center rounded-sm bg-[#75B943]">
                  <Text className="text-[11px] text-white">$</Text>
                </View>
                <Text className="flex-1 font-jakarta-semibold text-[13px] text-[#222222]">
                  Cash
                </Text>
                <Text className="text-[20px] text-[#555555]">›</Text>
              </View>
              <Pressable className="h-12 items-center justify-center rounded-md bg-black">
                <Text className="font-jakarta-bold text-[14px] text-white">
                  Choose Priority
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function RideOption({
  icon,
  imageSource,
  name,
  price,
  time,
  oldPrice,
}: {
  icon?: string;
  imageSource?: number;
  name: string;
  price: string;
  time: string;
  oldPrice?: string;
}) {
  return (
    <Pressable className="flex-row items-center border-b border-[#F0F0F0] px-2 py-2.5">
      {imageSource ? (
        <Image
          source={imageSource}
          className="mr-4 h-10 w-[58px]"
          resizeMode="contain"
        />
      ) : (
        <Text className="mr-4 text-[29px]">{icon}</Text>
      )}
      <View className="flex-1">
        <Text className="font-jakarta-bold text-[14px] text-[#222222]">
          {name}
        </Text>
        <Text className="font-jakarta text-xs text-[#555555]">{time}</Text>
      </View>
      <View className="items-end">
        <Text className="font-jakarta-semibold text-[13px] text-[#222222]">
          {price}
        </Text>
        {oldPrice ? (
          <Text className="text-[10px] text-[#777777] line-through">
            {oldPrice}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
