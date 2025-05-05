import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const [useCoverLetterAlways, setUseCoverLetterAlways] = useState(false);
  const [useCoverLetterIfRequired, setUseCoverLetterIfRequired] = useState(false);

  const fetchProfile = async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return;
  
    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProfile(data);
  
      // Загрузка фото из резюме
      const resumeRes = await fetch(`${API_URL}/resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resumeData = await resumeRes.json();
  
      if (Array.isArray(resumeData.items) && resumeData.items.length > 0) {
        const photoUrl = resumeData.items[0]?.photo?.small;
        if (photoUrl) {
          setProfile((prev: any) => ({ ...prev, resumePhoto: photoUrl }));
        }
      }
  
    } catch (e) {
      console.error('Ошибка загрузки профиля:', e);
    } finally {
      setLoading(false);
    }
  };
  

  const loadCoverLetter = async () => {
    const stored = await AsyncStorage.getItem('defaultCoverLetter');
    if (stored) setCoverLetter(stored);
  };

  const saveCoverLetter = async () => {
    await AsyncStorage.setItem('defaultCoverLetter', coverLetter);
  };

  const loadCoverLetterPrefs = async () => {
    const always = await AsyncStorage.getItem('useCoverLetterAlways');
    const ifRequired = await AsyncStorage.getItem('useCoverLetterIfRequired');
    setUseCoverLetterAlways(always === 'true');
    setUseCoverLetterIfRequired(ifRequired === 'true');
  };

  const toggleAlways = async (value: boolean) => {
    setUseCoverLetterAlways(value);
    if (value) {
      setUseCoverLetterIfRequired(false);
      await AsyncStorage.setItem('useCoverLetterIfRequired', 'false');
    }
    await AsyncStorage.setItem('useCoverLetterAlways', value.toString());
  };

  const toggleIfRequired = async (value: boolean) => {
    setUseCoverLetterIfRequired(value);
    if (value) {
      setUseCoverLetterAlways(false);
      await AsyncStorage.setItem('useCoverLetterAlways', 'false');
    }
    await AsyncStorage.setItem('useCoverLetterIfRequired', value.toString());
  };

  const handleStartAutoApply = () => {
    navigation.navigate('Поиск' as never);
  };

  useEffect(() => {
    fetchProfile();
    loadCoverLetter();
    loadCoverLetterPrefs();
  }, []);

  useEffect(() => {
    if (!coverLetter.trim()) {
      setUseCoverLetterAlways(false);
      setUseCoverLetterIfRequired(false);
    }
  }, [coverLetter]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileCard}>
      <Image
  source={{
    uri:
      profile?.resumePhoto ||
      profile?.avatar_urls?.['90'] ||
      'https://cdn-icons-png.flaticon.com/512/847/847969.png',
  }}
  style={styles.avatar}
/>
        <View style={{ flex: 1 }}>
          <Text style={styles.fullName}>
            {profile?.first_name} {profile?.last_name}
          </Text>
          <TouchableOpacity onPress={handleStartAutoApply}>
            <Text style={styles.autoApplyButton}>Начать автоотклик</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Сопроводительное письмо (по умолчанию)</Text>
        <TextInput
          multiline
          style={styles.input}
          placeholder="Укажите текст, который будет подставляться при отклике"
          placeholderTextColor="#999"
          value={coverLetter}
          onChangeText={setCoverLetter}
        />
        <TouchableOpacity style={styles.saveButton} onPress={saveCoverLetter}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveButtonText}>Сохранить</Text>
        </TouchableOpacity>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Всегда использовать сопроводительное</Text>
          <Switch
            value={useCoverLetterAlways}
            onValueChange={toggleAlways}
            disabled={!coverLetter.trim()}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Только если требуется вакансией</Text>
          <Switch
            value={useCoverLetterIfRequired}
            onValueChange={toggleIfRequired}
            disabled={!coverLetter.trim()}
          />
        </View>
      </View>
      <View style={styles.infoSection}>
  <Text style={styles.infoTitle}>Дополнительная информация</Text>

  <View style={styles.infoRow}>
    <Ionicons name="search-outline" size={16} color="#888" style={styles.infoIcon} />
    <Text style={styles.infoText}>Просматривает до 200 вакансий в день</Text>
  </View>

  <View style={styles.infoRow}>
    <Ionicons name="send-outline" size={16} color="#888" style={styles.infoIcon} />
    <Text style={styles.infoText}>Откликается максимум на 50 вакансий в день</Text>
  </View>

  <View style={styles.infoRow}>
    <Ionicons name="sync-outline" size={16} color="#888" style={styles.infoIcon} />
    <Text style={styles.infoText}>Работает в фоновом режиме, пока вы авторизованы</Text>
  </View>

  <Text style={styles.version}>Версия приложения: 1.0.0</Text>
</View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 80,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1C',
    padding: 15,
    borderRadius: 16,
    marginBottom: 30,
    alignItems: 'center',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 40,
    marginRight: 16,
  },
  fullName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  autoApplyButton: {
    marginTop: 5,
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '400',
  },
  section: {
    marginBottom: 30,
  },
  label: {
    color: '#999',
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#1C1C1C',
    color: '#fff',
    padding: 12,
    borderRadius: 16,
    textAlignVertical: 'top',
    height: 120,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  toggleLabel: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 20,
    marginTop: 30,
    marginBottom: 40,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    color: '#aaa',
    fontSize: 14,
    flexShrink: 1,
  },
  version: {
    marginTop: 50,
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
  },
});