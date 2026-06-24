import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

type ExpoExtra = {
  eas?: {
    projectId?: string;
  };
};

export type PushRegistrationResult = {
  token: string | null;
  supported: boolean;
  message: string;
};

export async function registerExpoPushToken(): Promise<PushRegistrationResult> {
  if (Platform.OS === "web") {
    return {
      token: null,
      supported: false,
      message: "Web preview không hỗ trợ lấy Expo push token thật."
    };
  }

  if (!Device.isDevice) {
    return {
      token: null,
      supported: false,
      message: "Cần chạy app trên thiết bị thật hoặc emulator native để lấy push token."
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2D6A4F"
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let permissionStatus = existingPermissions.status;

  if (permissionStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    permissionStatus = requestedPermissions.status;
  }

  if (permissionStatus !== "granted") {
    return {
      token: null,
      supported: false,
      message: "Chưa được cấp quyền push notification trên thiết bị."
    };
  }

  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  const projectId = Constants.easConfig?.projectId ?? extra?.eas?.projectId;
  const pushToken = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return {
    token: pushToken.data,
    supported: true,
    message: "Đã lấy Expo push token thật từ thiết bị."
  };
}
