import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import "./global.css";
import {
  Image,
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

export default function App() {
  const [activeTab, setActiveTab] = useState("Home");
  const [mode, setMode] = useState("Ride");
  const [fontsLoaded] = useFonts({
    JakartaRegular: require("./assets/fonts/PlusJakartaSans-Regular.ttf"),
    JakartaMedium: require("./assets/fonts/PlusJakartaSans-Medium.ttf"),
    JakartaSemiBold: require("./assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    JakartaBold: require("./assets/fonts/PlusJakartaSans-Bold.ttf"),
  });

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
                  className="h-[92px] w-[230px] rounded-lg"
                />
                <Image
                  source={require("./assets/images/onboarding2.png")}
                  className="h-[92px] w-[230px] rounded-lg"
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
                    className={`h-[21px] w-[21px] ${isActive ? "opacity-100" : "opacity-55"}`}
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
    </SafeAreaView>
  );
}
