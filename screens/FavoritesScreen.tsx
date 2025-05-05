import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadFavorites = async () => {
        const savedFavorites = await AsyncStorage.getItem('favoriteVacancies');
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }
      };
      loadFavorites();
    }, [])
  );

  const handleRemoveFromFavorites = async (vacancyId: string) => {
    const updatedFavorites = favorites.filter((vacancy) => vacancy.id !== vacancyId);
    setFavorites(updatedFavorites);
    await AsyncStorage.setItem('favoriteVacancies', JSON.stringify(updatedFavorites));
  };

  const experienceMap: Record<string, string> = {
    noExperience: 'без опыта',
    between1And3: 'от 1 до 3 лет',
    between3And6: 'от 3 до 6 лет',
    moreThan6: 'более 6 лет',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Избранное</Text>
        <Text style={styles.favoritesCount}>{favorites.length} вакансий</Text>
      </View>

      {favorites.length > 0 ? (
        favorites.map((vacancy, index) => {
          const salary = vacancy.salary;
          let salaryText = '';
          if (salary) {
            const formatNumber = (num: number) =>
              num.toLocaleString('ru-RU', { useGrouping: true });
          
            if (salary.from && salary.to) {
              salaryText = `${formatNumber(salary.from)} – ${formatNumber(salary.to)} ₽ за месяц`;
            } else if (salary.from) {
              salaryText = `от ${formatNumber(salary.from)} ₽ за месяц`;
            }
          }

          const publishedDate = new Date(vacancy.published_at);
          const formattedDate = publishedDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
          });

          return (
            <View key={vacancy.id || index} style={styles.vacancyItem}>
              <View style={styles.vacancyRow}>
                <View style={styles.vacancyDetailsContainer}>
                  <Text style={styles.vacancyTitle}>{vacancy.name}</Text>
                  {salaryText ? (
                    <Text style={styles.vacancySalary}>{salaryText}</Text>
                  ) : null}
                  <Text style={styles.vacancyEmployer}>{vacancy.employer?.name}</Text>
                  <Text style={styles.vacancyLocation}>
                    {vacancy.area?.name}
                  </Text>

                  {/* Опыт работы */}
                  {vacancy.experience?.id && (
                    <View style={styles.experienceBox}>
                      <Ionicons
                        name="briefcase-outline"
                        size={16}
                        color="#ccc"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.experienceText}>
                        {vacancy.experience?.id === 'noExperience'
                          ? 'Без опыта'
                          : `Опыт ${experienceMap[vacancy.experience.id]}`}
                      </Text>
                    </View>
                  )}

                  {/* Дата публикации */}
                  <Text style={styles.publishDate}>Опубликовано {formattedDate}</Text>
                </View>

                <View style={styles.vacancyRightColumn}>
                  {vacancy.employer?.logo_urls?.original && (
                    <Image
                      source={{ uri: vacancy.employer.logo_urls.original }}
                      style={styles.logo}
                    />
                  )}
                  <TouchableOpacity
                    style={styles.heartButton}
                    onPress={() => handleRemoveFromFavorites(vacancy.id)}
                  >
                    <Ionicons name="heart" size={26} color="#FF0000" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.respondButton}>
                <Text style={styles.respondButtonText}>Откликнуться</Text>
              </TouchableOpacity>
            </View>
          );
        })
      ) : (
        <Text style={styles.noFavoritesText}>Нет вакансий в избранном.</Text>
      )}
    </ScrollView>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  favoritesCount: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 5,
  },
  vacancyItem: {
    backgroundColor: '#1C1C1C',
    borderRadius: 25,
    marginBottom: 15,
    padding: 22,
  },
  vacancyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vacancyDetailsContainer: {
    flex: 0.8,
  },
  vacancyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  vacancySalary: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 15,
  },
  vacancyEmployer: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  vacancyLocation: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  experienceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#3a3a3a',
    padding: 5,
    borderRadius: 7,
    paddingHorizontal: 8,
    flexShrink: 1,
    alignSelf: 'flex-start',
  },
  experienceText: {
    color: '#fff',
    fontSize: 14,
  },
  publishDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 5,
    marginBottom: 20,
  },
  vacancyRightColumn: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  heartButton: {
    position: 'absolute',
    marginBottom: 10,
    top: 0,
    right: 0,
  },
  logo: {
    width: 45,
    height: 45,
    marginBottom: 10,
    borderRadius: 25,
  },
  respondButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  respondButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  noFavoritesText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});