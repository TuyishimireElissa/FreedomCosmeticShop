/**
 * MainNavigator — Bottom tab navigation + stack navigators.
 *
 * Tabs: Home, Catalog, Cart, Wishlist, Account
 * Stack: Product detail, Checkout, Order tracking, Settings, etc.
 */

import React from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Home, ShoppingBag, Heart, User, LayoutGrid } from "lucide-react-native"

import { HomeScreen } from "@/screens/HomeScreen"
import { ProductListScreen } from "@/screens/ProductListScreen"
import { ProductDetailScreen } from "@/screens/ProductDetailScreen"
import { CartScreen } from "@/screens/CartScreen"
import { CheckoutScreen } from "@/screens/CheckoutScreen"
import { OrderTrackingScreen } from "@/screens/OrderTrackingScreen"
import { AccountScreen } from "@/screens/AccountScreen"
import { OrderHistoryScreen } from "@/screens/OrderHistoryScreen"
import { WishlistScreen } from "@/screens/WishlistScreen"
import { NotificationsScreen } from "@/screens/NotificationsScreen"
import { SettingsScreen } from "@/screens/SettingsScreen"

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

// ─── Tab navigators ──────────────────────────────────────────────────────────

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="ProductList" component={ProductListScreen} />
    </Stack.Navigator>
  )
}

function CartStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartMain" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </Stack.Navigator>
  )
}

function AccountStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountMain" component={AccountScreen} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  )
}

// ─── Main bottom tabs ────────────────────────────────────────────────────────

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#b76e79",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#f3e0d8",
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={ProductListScreen}
        options={{
          tabBarLabel: "Shop",
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStack}
        options={{
          tabBarLabel: "Cart",
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="WishlistTab"
        component={WishlistScreen}
        options={{
          tabBarLabel: "Wishlist",
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={{
          tabBarLabel: "Account",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  )
}
