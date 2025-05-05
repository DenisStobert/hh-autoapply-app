// backgroundTasks.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

const TASK_NAME = 'AUTO_APPLY_TASK';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return BackgroundFetch.BackgroundFetchResult.NoData;

    const query = (await AsyncStorage.getItem('lastQuery')) || 'разработчик';
    const appliedRaw = await AsyncStorage.getItem('appliedVacancyIds');
    const appliedSet = new Set<string>(appliedRaw ? JSON.parse(appliedRaw) : []);

    const res = await fetch(`${API_URL}/vacancies?text=${encodeURIComponent(query)}&per_page=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    const vacancies = data.items || [];

    let sent = 0;
    for (const vac of vacancies) {
      if (appliedSet.has(vac.id)) continue;

      await fetch(`${API_URL}/vacancies/${vac.id}/apply`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      appliedSet.add(vac.id);
      sent++;
    }

    await AsyncStorage.setItem('appliedVacancyIds', JSON.stringify([...appliedSet]));

    return sent > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (e) {
    console.error('❌ Background fetch failed:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask() {
  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied) {
    console.warn('🚫 Background fetch is not available');
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 15, // каждые 15 минут
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('✅ Background task registered');
  }
}
