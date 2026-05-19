declare module 'expo-haptics' {
  export const ImpactFeedbackStyle: any;
  export const NotificationFeedbackType: any;
  export function impactAsync(style?: any): Promise<void>;
  export function notificationAsync(type?: any): Promise<void>;
}
