import { configureStore, createSlice, nanoid } from "@reduxjs/toolkit";
import * as Device from "expo-device"; // Native module via Expo
import * as Haptics from "expo-haptics"; // Native module via Expo
import { useMemo, useState } from "react";
import { FlatList, Platform, SafeAreaView, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Appbar, Avatar, Badge, Banner, Button, Card, Divider, MD3DarkTheme, MD3LightTheme, Provider as PaperProvider, Switch, Text, TextInput } from "react-native-paper";
import { Provider as ReduxProvider, useDispatch, useSelector } from "react-redux";

/********************
 * Managing State with Redux
 * 1) Introduction to Redux
 * 2) Actions, reducers, store
 * 3) Connecting components
 ********************/

// UI slice: theme + banners
const uiSlice = createSlice({
  name: "ui",
  initialState: { darkMode: false, showBanner: true },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
    },
    dismissBanner(state) {
      state.showBanner = false;
    },
  },
});

// Counter slice to demonstrate basic actions
const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment(state) {
      state.value += 1;
    },
    decrement(state) {
      state.value -= 1;
    },
    reset(state) {
      state.value = 0;
    },
    addByAmount(state, action) {
      state.value += action.payload;
    },
  },
});

// Todo slice to demonstrate lists and immutable updates
const todosSlice = createSlice({
  name: "todos",
  initialState: { items: [], doneItems: [] }, // Add a doneItems array to manage completed tasks
  reducers: {
    addTodo: {
      reducer(state, action) {
        state.items.unshift(action.payload);
      },
      prepare(title) {
        return { payload: { id: nanoid(), title, done: false, createdAt: Date.now() } };
      },
    },
    toggleTodo(state, action) {
      const t = state.items.find((x) => x.id === action.payload);
      if (t) {
        t.done = !t.done;

        // If done is true, move the task to doneItems
        if (t.done) {
          state.doneItems.push(t);
          state.items = state.items.filter(item => item.id !== action.payload);  // Remove from active list
        } else {
          state.items.unshift(t); // Move back to the active list
          state.doneItems = state.doneItems.filter(item => item.id !== action.payload); // Remove from done list
        }
      }
    },
    removeTodo(state, action) {
      state.items = state.items.filter((x) => x.id !== action.payload);
      state.doneItems = state.doneItems.filter((x) => x.id !== action.payload); // Ensure it is removed from doneItems as well
    },
    clearTodos(state) {
      state.items = [];
      state.doneItems = []; // Clear the doneItems too
    },
  },
});


const { toggleDarkMode, dismissBanner } = uiSlice.actions;
const { increment, decrement, reset, addByAmount } = counterSlice.actions;
const { addTodo, toggleTodo, removeTodo, clearTodos } = todosSlice.actions;

const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    counter: counterSlice.reducer,
    todos: todosSlice.reducer,
  },
});

/********************
 * App Root
 ********************/

export default function App() {
  return (
    <ReduxProvider store={store}>
      <ThemedApp />
    </ReduxProvider>
  );
}

function ThemedApp() {
  const darkMode = useSelector((s) => s.ui.darkMode);
  const theme = useMemo(() => (darkMode ? MD3DarkTheme : MD3LightTheme), [darkMode]);
  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={{ flex: 1 }}>
        <AppScaffold />
      </SafeAreaView>
    </PaperProvider>
  );
}

/********************
 * User Interface Design
 * 1) Designing UIs for mobile
 * 2) Responsive/adaptive
 * 3) Best practices for mobile UI/UX (accessibility, touch targets, feedback)
 ********************/

function AppScaffold() {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const showBanner = useSelector((s) => s.ui.showBanner);

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <Appbar.Header>
        <Appbar.Content title="Expo + Redux Demo" subtitle={`Running on ${Device.osName ?? "Unknown OS"}`} />
        <DarkModeSwitch />
      </Appbar.Header>

      {showBanner && (
        <Banner
          visible
          actions={[{ label: "Got it", onPress: () => dispatch(dismissBanner()) }]}
          icon={({ size }) => (
            <Avatar.Icon size={size} icon="information-outline" />
          )}
        >
          This screen demonstrates Redux state, responsive layout, and native modules (Haptics, Device).
        </Banner>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={[isTablet && styles.contentTablet, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.column, isTablet && styles.columnTablet]}>
          <CounterCard />
          <LibraryCard />
        </View>
        <View style={[styles.column, isTablet && styles.columnTablet]}>
          <TodosCard />
          <NativeModulesCard />
        </View>
      </ScrollView>

      <Appbar style={styles.footer}>
        <Appbar.Action icon="github" accessibilityLabel="GitHub" onPress={() => {}} />
        <Appbar.Content title="Footer" subtitle={Platform.select({ ios: "iOS", android: "Android", default: "Web" })} />
      </Appbar>
    </View>
  );
}

function DarkModeSwitch() {
  const dispatch = useDispatch();
  const darkMode = useSelector((s) => s.ui.darkMode);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 12 }}>
      <Text accessibilityRole="header" style={{ marginRight: 8 }}>{darkMode ? "Dark" : "Light"}</Text>
      <Switch
        value={darkMode}
        onValueChange={() => dispatch(toggleDarkMode())}
        accessibilityLabel="Toggle dark mode"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      />
    </View>
  );
}

/********************
 * Working with External Libraries
 * 1) Using third-party libs (React Native Paper for UI)
 * 2) Popular libs showcase (Paper components)
 * 3) Integrating native modules (expo-haptics, expo-device)
 ********************/

function CounterCard() {
  const dispatch = useDispatch();
  const value = useSelector((s) => s.counter.value);
  const [customAmount, setCustomAmount] = useState("1");

  const bump = async (delta) => {
    // Haptic feedback for good UX
    await Haptics.selectionAsync();
    dispatch(addByAmount(delta));
  };

  return (
    <Card style={styles.card}>
      <Card.Title title="Counter (Redux)" subtitle="Actions, reducers, store" left={(props) => <Avatar.Icon {...props} icon="counter" />} />
      <Card.Content>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Badge size={32} style={{ marginRight: 12 }}>{value}</Badge>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button accessibilityLabel="Decrement" onPress={() => dispatch(decrement())} mode="outlined">-1</Button>
            <Button accessibilityLabel="Increment" onPress={() => dispatch(increment())} mode="contained">+1</Button>
            <Button accessibilityLabel="Reset" onPress={() => dispatch(reset())}>Reset</Button>
          </View>
        </View>
        <Divider style={{ marginVertical: 12 }} />
        <TextInput
          label="Custom amount"
          keyboardType="number-pad"
          value={customAmount}
          onChangeText={setCustomAmount}
          right={<TextInput.Affix text="±" />}
        />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Button onPress={() => bump(Number(customAmount) || 0)} mode="contained">Add</Button>
          <Button onPress={() => bump(-(Number(customAmount) || 0))} mode="outlined">Subtract</Button>
        </View>
      </Card.Content>
    </Card>
  );
}

function TodosCard() {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.todos.items);
  const doneItems = useSelector((s) => s.todos.doneItems);
  const [title, setTitle] = useState("");
  const [showBanner, setShowBanner] = useState(false); // State to manage banner visibility
  const { width } = useWindowDimensions();
  const numColumns = width >= 900 ? 2 : 1; // responsive list

  const handleAddTodo = () => {
    if (!title.trim()) return;
    dispatch(addTodo(title.trim()));
    setTitle("");
    setShowBanner(true); // Show banner when todo is added
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Hide the banner after 3 seconds
    setTimeout(() => {
      setShowBanner(false);
    }, 3000);
  };

  return (
    <Card style={styles.card}>
      <Card.Title title="Todos (Redux list)" subtitle="Responsive FlatList" left={(props) => <Avatar.Icon {...props} icon="check-circle-outline" />} />
      <Card.Content>
        {/* Banner for Todo Added Notification */}
        {showBanner && (
          <Banner
            visible={showBanner}
            actions={[{ label: "Got it", onPress: () => setShowBanner(false) }]}
            icon={({ size }) => <Avatar.Icon size={size} icon="check-circle" />}
          >
            Todo item has been added!
          </Banner>
        )}

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={{ flex: 1 }}
            label="What needs doing?"
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={handleAddTodo} // Trigger when pressing Enter
            returnKeyType="done"
          />
          <Button mode="contained" onPress={handleAddTodo}>Add</Button>
        </View>
        <Divider style={{ marginVertical: 12 }} />

        {/* Active Todos List */}
        <Text>To Do:</Text>
        <FlatList
          data={items}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Card style={{ flex: 1, marginRight: numColumns > 1 ? 8 : 0 }}>
              <Card.Title
                title={item.title}
                subtitle={new Date(item.createdAt).toLocaleString()}
                left={(props) => <Avatar.Icon {...props} icon={item.done ? "check" : "circle-outline"} />}
              />
              <Card.Actions>
                <Button onPress={() => dispatch(toggleTodo(item.id))}>{item.done ? "Undo" : "Done"}</Button>
                <Button onPress={() => dispatch(removeTodo(item.id))} textColor="#d11">Remove</Button>
              </Card.Actions>
            </Card>
          )}
          ListEmptyComponent={<Text accessibilityLabel="Empty list">No todos yet. Add one above.</Text>}
        />
        
        {/* Done Todos List */}
        <Text>Done:</Text>
        <FlatList
          data={doneItems}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Card style={{ flex: 1, marginRight: numColumns > 1 ? 8 : 0 }}>
              <Card.Title
                title={item.title}
                subtitle={new Date(item.createdAt).toLocaleString()}
                left={(props) => <Avatar.Icon {...props} icon="check" />}
              />
              <Card.Actions>
                <Button onPress={() => dispatch(toggleTodo(item.id))}>Undo</Button>
                <Button onPress={() => dispatch(removeTodo(item.id))} textColor="#d11">Remove</Button>
              </Card.Actions>
            </Card>
            
          )}
        
          ListEmptyComponent={<Text accessibilityLabel="Empty list">No done tasks yet.</Text>}
        />
        {items.length > 0 && (
          <Button style={{ marginTop: 8 }} onPress={() => dispatch(clearTodos())}>Clear All</Button>
        )}
      </Card.Content>
    </Card>
  );
}



function LibraryCard() {
  return (
    <Card style={styles.card}>
      <Card.Title title="Third‑party UI library" subtitle="React Native Paper components" left={(props) => <Avatar.Icon {...props} icon="palette" />} />
      <Card.Content>
        <Text>
          This app uses <Text style={{ fontWeight: "bold" }}>react-native-paper</Text> for theming, typography, and accessible UI primitives.
          Try toggling dark mode above and notice automatic color adaptation.
        </Text>
        <View style={{ height: 12 }} />
        <Text>Other popular libraries you can explore:</Text>
        <View style={{ height: 6 }} />
        <Text>• React Navigation — screens & stacks</Text>
        <Text>• React Native Elements — alternative UI kit</Text>
        <Text>• Reanimated/Gesture Handler — high‑performance gestures</Text>
      </Card.Content>
    </Card>
  );
}

function NativeModulesCard() {
  return (
    <Card style={styles.card}>
      <Card.Title title="Native modules" subtitle="Expo Haptics & Device" left={(props) => <Avatar.Icon {...props} icon="cellphone" />} />
      <Card.Content>
        <Text>Press the button below to feel haptic feedback (supported devices only).</Text>
        <View style={{ height: 8 }} />
        <Button
          mode="contained"
          onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
          accessibilityHint="Triggers a short vibration if available"
        >
          Trigger Haptic Success
        </Button>
        <Divider style={{ marginVertical: 12 }} />
        <Text selectable>
          Device: {Device.deviceName || "Unknown"} ({Device.brand || "?"})\n
          Model: {Device.modelName || "?"}\n
          OS: {Device.osName} {Device.osVersion}
        </Text>
      </Card.Content>
    </Card>
  );
}

/********************
 * Styles — mobile‑first, adapt on tablets
 ********************/

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  containerTablet: { paddingHorizontal: 12 },
  content: { flex: 1, padding: 12 },
  contentTablet: { flexDirection: "row", gap: 12 },
  column: { flex: 1 },
  columnTablet: { flex: 1 },
  card: { marginBottom: 12, borderRadius: 16, overflow: "hidden" },
  footer: { justifyContent: "center" },
});