import { createNavigationContainerRef } from '@react-navigation/native';

export type RootStackParamList = {
  SplashScreen: undefined;
  LoginScreen: undefined;
  MainTabs: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: RootStackParamList[typeof name]) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function resetTo(name: keyof RootStackParamList) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name }],
    });
  }
}
