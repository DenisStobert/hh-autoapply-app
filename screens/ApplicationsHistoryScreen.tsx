import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Linking } from 'react-native';
import type { IconProps } from '@expo/vector-icons/build/createIconSet';

export default function ApplicationsHistoryScreen() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  type IoniconName = IconProps<any>['name'];

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem('appliedVacancies');
      if (saved) {
        const parsed = JSON.parse(saved);

        const realApplications = parsed.filter((item: any) =>
          item.created_at && item.state?.id
        );

        realApplications.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setApplications(realApplications);
        await AsyncStorage.setItem('appliedVacancies', JSON.stringify(realApplications));
      }
    } catch (e) {
      console.error('Ошибка загрузки откликов:', e);
    } finally {
      setLoading(false);
    }
  };

  const openVacancyInHH = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn("Невозможно открыть ссылку:", url);
      }
    } catch (error) {
      console.error("Ошибка при открытии ссылки:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchApplications();
    }, [])
  );

  const getStatusStyle = (statusId: string): {
    color: string;
    text: string;
  } => {
    switch (statusId) {
      case 'invited':
      case 'in_progress':
        return {
          color: '#4CAF50',
          text: 'Собеседование',
        };
      case 'rejected':
        return {
          color: '#F44336',
          text: 'Отказ',
        };
      case 'response':
      default:
        return {
          color: '#2C2C2C',
          text: 'Не просмотрен',
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = getStatusStyle(item.state?.id);
  
    let salaryText = '';
    const salary = item.salary;
    if (salary) {
      const formatNumber = (num: number) =>
        num.toLocaleString('ru-RU', { useGrouping: true });
  
      if (salary.from && salary.to) {
        salaryText = `${formatNumber(salary.from)} – ${formatNumber(salary.to)} ₽ за месяц`;
      } else if (salary.from) {
        salaryText = `от ${formatNumber(salary.from)} ₽ за месяц`;
      } else if (salary.to) {
        salaryText = `до ${formatNumber(salary.to)} ₽ за месяц`;
      }
    }
  
    return (
      <View style={styles.vacancyItem}>
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusText}>{status.text}</Text>
        </View>
  
        <View style={styles.vacancyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vacancyTitle}>{item.name}</Text>
            {salaryText ? (
              <Text style={styles.vacancySalary}>{salaryText}</Text>
            ) : null}
            <Text style={styles.vacancyEmployer}>{item.employer?.name}</Text>
            <Text style={styles.publishDate}>{formatDate(item.created_at)}</Text>
          </View>
  
          {item.employer?.logo_urls?.original && (
            <Image
              source={{ uri: item.employer.logo_urls.original }}
              style={styles.logo}
            />
          )}
        </View>
  
        <TouchableOpacity
          onPress={() => openVacancyInHH(item.alternate_url)}
          style={[styles.respondButton]}
        >
          <Text style={styles.respondButtonText}>Открыть вакансию</Text>
        </TouchableOpacity>
      </View>
    );
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.header}>История откликов</Text>
      <Text style={styles.countLabel}>{applications.length.toLocaleString('ru-RU')} вакансий</Text>
      {loading ? (
        <ActivityIndicator color="#007BFF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 15,
    paddingTop: 80,
  },
  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  countLabel: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 5,
    marginBottom: 20,
  },
  vacancyItem: {
    backgroundColor: '#1C1C1C',
    borderRadius: 25,
    marginBottom: 15,
    padding: 22,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderRadius: 7,
    marginBottom: 8,
  },
  statusText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  vacancyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  vacancyEmployer: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 6,
  },
  publishDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
  },
  lastOnline: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  responseRate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  respondButton: {
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.15)', // синий с opacity
  },
  
  respondButtonText: {
    color: '#007AFF', // яркий синий
    fontSize: 17,
    fontWeight: '500',
  },
  vacancySalary: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: '500',
  },
  vacancyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  logo: {
    width: 45,
    height: 45,
    borderRadius: 22,
    marginLeft: 10,
  },
});