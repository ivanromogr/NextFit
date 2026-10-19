import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Keep the interactive row above both gesture indicators and Android's system bar.
export default function useTabBarLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);
  return {
    height: 60 + bottom,
    paddingBottom: bottom,
    paddingTop: 8,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
}
