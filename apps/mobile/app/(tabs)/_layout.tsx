import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { Colors } from '../../constants/theme'

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Roboto_900Black',
          textTransform: 'uppercase' as const,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ focused }) => <TabIcon icon="💳" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => <TabIcon icon="✨" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ focused }) => <TabIcon icon="🎯" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: 'Subs',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔄" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: 'Bills',
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔔" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
