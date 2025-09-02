import { Audio } from 'expo-av';

export async function playSound(soundFile: any) {
  const { sound } = await Audio.Sound.createAsync(soundFile);
  await sound.playAsync();
  sound.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      sound.unloadAsync();
    }
  });
}
