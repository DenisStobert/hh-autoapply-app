import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image, KeyboardAvoidingView, Platform, TextInput as RNTextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Modal from 'react-native-modal';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { navigationRef } from '../NavigationService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';

type RootStackParamList = {
  LoginScreen: undefined;
  MainTabs: undefined;
};

type JobSearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

export default function JobSearchScreen() {
  const [query, setQuery] = useState('');
  const [salaryFrom, setSalaryFrom] = useState('');
  const [onlyWithSalary, setOnlyWithSalary] = useState(false);
  const [experience, setExperience] = useState<string | null>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [favoriteVacancies, setFavoriteVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [totalFound, setTotalFound] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [defaultQueryUsed, setDefaultQueryUsed] = useState(false);
  const [lastUsedQuery, setLastUsedQuery] = useState<string | null>(null);
  const [isDefaultView, setIsDefaultView] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [applyAllModalVisible, setApplyAllModalVisible] = useState(false);
  const [hideApplyInfoModal, setHideApplyInfoModal] = useState(false);
  const [applyingProgress, setApplyingProgress] = useState<number | null>(null); // null = не откликается
  const [totalToApply, setTotalToApply] = useState<number>(0);
  const [appliedVacancyIds, setAppliedVacancyIds] = useState<Set<string>>(new Set());
  const [selectedCities, setSelectedCities] = useState<{ id: string; name: string }[]>([]);
  const [russianCities, setRussianCities] = useState<{ id: string; name: string }[]>([]);
  const [citySearchModalVisible, setCitySearchModalVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [nextDelaySeconds, setNextDelaySeconds] = useState<number | null>(null);
  const [lastAppliedCompany, setLastAppliedCompany] = useState<string | null>(null);


  const navigation = useNavigation<JobSearchScreenNavigationProp>();
  const [tokenLoaded, setTokenLoaded] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<RNTextInput | null>(null);
  const skipNextFocus = useRef(false);
  const shouldCancelApplyRef = useRef(false);

  const [resume, setResume] = useState<null | {
    id: string;
    title: string;
    area: { name: string };
    photo: { small: string } | null;
  }>(null);

  const waitWithCountdown = async (ms: number, onTick: (secondsLeft: number) => void) => {
    return new Promise<void>((resolve) => {
      let remaining = Math.floor(ms / 1000);
      const interval = setInterval(() => {
        remaining--;
        onTick(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  };
  
  useEffect(() => {
    const fetchResume = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.warn('❌ Нет токена');
        return;
      }
  
      try {
        const res = await fetch(`${API_URL}/resumes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        const data = await res.json();
  
        // Попробуем разные форматы:
        if (Array.isArray(data.items) && data.items.length > 0) {
          setResume(data.items[0]);
        } else if (Array.isArray(data) && data.length > 0) {
          setResume(data[0]);
        }
      } catch (error) {
        console.error('🚨 Ошибка при получении резюме:', error);
      }
    };
  
    if (applyAllModalVisible) {
      fetchResume();
    }
  }, [applyAllModalVisible]);

  useEffect(() => {
    const fetchRussianCities = async () => {
      try {
        const res = await fetch('https://api.hh.ru/areas');
        const data = await res.json();
    
        const russia = data.find((country: any) => country.name === 'Россия');
    
        const extractCities = (areas: any[]): { id: string; name: string }[] => {
          let cities: { id: string; name: string }[] = [];
    
          for (const area of areas) {
            if (area.areas && area.areas.length > 0) {
              // Есть вложенные районы — рекурсивно
              cities = cities.concat(extractCities(area.areas));
            } else {
              // Нет вложенных — это город
              cities.push({ id: area.id, name: area.name });
            }
          }
    
          return cities;
        };
    
        if (russia && Array.isArray(russia.areas)) {
          const allCities = extractCities(russia.areas);
          setRussianCities(allCities.sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (error) {
        console.error('Ошибка при загрузке городов:', error);
      }
    };    
  
    fetchRussianCities();
  }, []);  
  

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        navigation.dispatch(CommonActions.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        }));
      } else {
        setTokenLoaded(true);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const loadApplied = async () => {
      const appliedRaw = await AsyncStorage.getItem('appliedVacancyIds');
      if (appliedRaw) {
        setAppliedVacancyIds(new Set(JSON.parse(appliedRaw)));
      }
    };
    loadApplied();
  }, []);

  useEffect(() => {
    const nav = navigationRef.current as any;
    if (!nav || !nav.addListener) return;
  
    const unsubscribe = nav.addListener('tabPressSearch', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
  
      if (query.trim() === '') {
        if (lastUsedQuery) {
          handleSearch(0, false, lastUsedQuery);
        } else {
          handleSearch(0, false, 'разработчик');
        }
      } else {
        handleSearch(0);
      }
    });
  
    return () => unsubscribe?.();
  }, [query, lastUsedQuery]);
  

  useFocusEffect(
    useCallback(() => {
      const loadFavorites = async () => {
        const storedFavorites = await AsyncStorage.getItem('favoriteVacancies');
        if (storedFavorites) {
          setFavoriteVacancies(JSON.parse(storedFavorites));
        }
      };
      loadFavorites();
    }, [])
  );

  useEffect(() => {
    const initDefaultSearch = async () => {
      const storedQuery = await AsyncStorage.getItem('lastQuery');
      if (storedQuery) {
        setLastUsedQuery(storedQuery);
        setIsDefaultView(true);
        handleSearch(0, false, storedQuery); // запуск с сохраненным
      } else {
        setLastUsedQuery('разработчик');
        setIsDefaultView(true);
        handleSearch(0, false, 'разработчик'); // запуск с популярным
      }
    };
  
    if (tokenLoaded && query.trim() === '') {
      initDefaultSearch();
    }
  }, [tokenLoaded]);
  
  useEffect(() => {
    if (query.trim() !== '') {
      AsyncStorage.setItem('lastQuery', query);
    }
  }, [query]);

  useEffect(() => {
    const loadHistory = async () => {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) setSearchHistory(JSON.parse(history));
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (searchModalVisible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [searchModalVisible]);

  const saveToHistory = async (term: string) => {
    if (!term.trim()) return;
    const updated = [term.trim(), ...searchHistory.filter(q => q !== term.trim())].slice(0, 10);
    setSearchHistory(updated);
    await AsyncStorage.setItem('searchHistory', JSON.stringify(updated));
  };

  const handleApplyToAll = async () => {
    shouldCancelApplyRef.current = false;
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      alert('Токен не найден. Авторизуйтесь снова.');
      return;
    }
  
    const useAlways = (await AsyncStorage.getItem('useCoverLetterAlways')) === 'true';
    const useIfRequired = (await AsyncStorage.getItem('useCoverLetterIfRequired')) === 'true';
    const coverLetter = await AsyncStorage.getItem('defaultCoverLetter');
  
    const appliedIdsRaw = await AsyncStorage.getItem('appliedVacancyIds');
    const appliedVacancyIds = new Set<string>(appliedIdsRaw ? JSON.parse(appliedIdsRaw) : []);
  
    const perPage = 20;
    let page = 0;
    let sentCount = 0;
  
    setApplyingProgress(0);
    setTotalToApply(20); // лимит 20
  
    while (sentCount < 20 && !shouldCancelApplyRef.current) {
      const searchText = query.trim() || 'разработчик';
      let url = `${API_URL}/vacancies?text=${encodeURIComponent(searchText)}&search_field=name&page=${page}&per_page=${perPage}`;
      if (salaryFrom) url += `&salary_from=${salaryFrom}`;
      if (onlyWithSalary) url += `&only_with_salary=true`;
      if (experience) url += `&experience=${experience}`;
      if (selectedCities.length > 0) {
        url += `&area=${selectedCities[0].id}`;
      } else {
        url += `&area=113`; // вся Россия
      }
  
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (shouldCancelApplyRef.current) break;
  
      const data = await res.json();
      let items = data.items || [];
  
      // Убираем не-российские вакансии
      items = items.filter((vacancy: any) => vacancy.area?.id?.startsWith('1'));
  
      if (items.length === 0) break;
  
      for (let i = 0; i < items.length && sentCount < 20; i++) {
        const vacancy = items[i];
  
        if (appliedVacancyIds.has(vacancy.id)) continue;
        if (shouldCancelApplyRef.current) break;
  
        let message: string | undefined;
        if (useAlways && coverLetter?.trim()) {
          message = coverLetter;
        } else if (useIfRequired && vacancy.response_letter_required && coverLetter?.trim()) {
          message = coverLetter;
        }
  
        const applyRes = await fetch(`${API_URL}/vacancies/${vacancy.id}/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: message ? JSON.stringify({ message }) : JSON.stringify({}),
        });         
  
        if (!applyRes.ok) {
          console.warn(`❌ Не удалось откликнуться на ${vacancy.id}:`, await applyRes.text());
          continue;
        }
        
        const appliedVacancyData = await applyRes.json(); // ← получаем данные отклика
        appliedVacancyIds.add(vacancy.id);
        sentCount++;
        setApplyingProgress(sentCount);
        
        // Сохраняем в appliedVacancies
        const existingRaw = await AsyncStorage.getItem('appliedVacancies');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        existing.push({
          ...vacancy,
          id: vacancy.id, // гарантированно есть
          created_at: new Date().toISOString(),
          state: appliedVacancyData.state || { id: 'response' }, // подстраховка
        });
        await AsyncStorage.setItem('appliedVacancies', JSON.stringify(existing));
        
        const delay = Math.floor(Math.random() * (120 - 60 + 1)) + 60; // от 60 до 120 сек
setLastAppliedCompany(vacancy.employer?.name || 'Неизвестная компания');

for (let i = delay; i > 0; i--) {
  if (shouldCancelApplyRef.current) break;
  setNextDelaySeconds(i);
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
      }
  
      if ((page + 1) * perPage >= data.found) break;
      page++;
    }
  
    await AsyncStorage.setItem('appliedVacancyIds', JSON.stringify([...appliedVacancyIds]));
    setAppliedVacancyIds(appliedVacancyIds);
  
    setTimeout(() => {
      alert(`Отклики завершены: ${sentCount} новых.`);
      setApplyingProgress(null);
      setTotalToApply(0);
      setApplyAllModalVisible(false);
    }, 500);
  };
  

  const toggleCitySelection = useCallback((city: { id: string; name: string }) => {
    setSelectedCities((prev) => {
      const exists = prev.some((c) => c.id === city.id);
      const updated = exists
        ? prev.filter((c) => c.id !== city.id)
        : [...prev, city];
  
      if (!exists) {
        setSelectedCityId(city.id);
      } else if (city.id === selectedCityId) {
        setSelectedCityId(updated[0]?.id || null);
      }
  
      // Очистить поисковую строку после выбора города
      setCitySearchQuery('');
  
      return updated;
    });
  }, [selectedCityId]);  
  
  
  const toggleFavorite = async (vacancyId: string) => {
    let updatedFavorites = [...favoriteVacancies];

    const isAlreadyFavorite = updatedFavorites.some((vac: any) => vac.id === vacancyId);

    if (isAlreadyFavorite) {
      updatedFavorites = updatedFavorites.filter((vac: any) => vac.id !== vacancyId);
    } else {
      const vacancy = vacancies.find((vac: any) => vac.id === vacancyId);
      if (vacancy) {
        updatedFavorites.push(vacancy);
      }
    }

    await AsyncStorage.setItem('favoriteVacancies', JSON.stringify(updatedFavorites));
    setFavoriteVacancies(updatedFavorites);
  };

  const handleSearch = async (page = 0, append = false, searchOverride?: string) => {
    if (!tokenLoaded) return;
  
    if (append) setIsLoadingMore(true);
    else setLoading(true);
  
    setError('');
    setCurrentPage(page);
  
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      setError('Не найден токен. Пожалуйста, войдите снова.');
      setLoading(false);
      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      }));
      return;
    }
  
    const perPage = 20;
    const searchText = searchOverride ?? query.trim();
  
    let url = `${API_URL}/vacancies?text=${encodeURIComponent(searchText)}&search_field=name&page=${page}&per_page=${perPage}`;
    if (salaryFrom) url += `&salary_from=${salaryFrom}`;
    if (onlyWithSalary) url += `&only_with_salary=true`;
    if (experience) url += `&experience=${experience}`;
    if (selectedCities.length > 0) {
      console.log('🏙 Выбран город:', selectedCities[0]);
      url += `&area=${selectedCities[0].id}`; // ВАЖНО: только один, один `area=`, без массива
    } else {
      url += `&area=113`; // вся Россия
    }
  
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      const data = await response.json();
      let items = data.items || [];

// Оставляем только вакансии из России (area.id начинается с "1", у других стран другие id, например "159" — Казахстан)
items = items.filter((vacancy: any) => vacancy.area?.id && vacancy.area.id.startsWith('1'));
  
      setTotalFound(data.found || 0);
      setVacancies((prev) => append ? [...prev, ...items] : items);
      setTotalPages(Math.ceil(data.found / perPage));
  
      if (!searchOverride && query.trim()) {
        await saveToHistory(query.trim());
      }
  
    } catch (e) {
      setError('Произошла ошибка при загрузке вакансий');
    } finally {
      if (append) setIsLoadingMore(false);
      else setLoading(false);
    }
  };  
  
  const handleApplyFilters = () => {
    setFilterVisible(false);
    handleSearch(0);
  };

  const handleExperienceChange = (value: string) => {
    setExperience((prevExperience) => (prevExperience === value ? null : value));
  };

  const handleSalaryChange = (text: string) => {
    // Проверяем, чтобы salaryFrom не могло быть меньше минимального значения (например, 0)
    const parsedSalary = parseInt(text, 10);
    if (!isNaN(parsedSalary)) {
      setSalaryFrom(parsedSalary >= 0 ? text : '0');
    }
  };

  const getVacancyWord = () => 'вакансии';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
    <ScrollView
  style={styles.container}
  contentContainerStyle={{ paddingBottom: 90 }} // ← добавь это
  onScroll={({ nativeEvent }) => {
    const isCloseToBottom =
      nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
      nativeEvent.contentSize.height - 100;
    if (
      isCloseToBottom &&
      !loading &&
      !isLoadingMore &&
      currentPage + 1 < totalPages
    ) {
      handleSearch(currentPage + 1, true);
    }
  }}
  scrollEventThrottle={400}
>
      {/* Поисковая панель */}
      <View style={styles.searchPanel}>
        <View style={styles.searchContainer}>
          <TouchableOpacity onPress={() => handleSearch(0)} style={styles.searchButton}>
            <Ionicons name="search" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
  style={[styles.searchInput, { justifyContent: 'center' }]}
  activeOpacity={0.8}
  onPress={() => setSearchModalVisible(true)}
>
  <Text
    numberOfLines={1}
    ellipsizeMode="tail"
    style={{
      color: query ? '#fff' : 'rgba(255,255,255,0.4)',
      fontSize: 18,
    }}
  >
    {query || 'Должность, ключевые слова'}
  </Text>
</TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setFilterVisible(true)} style={styles.filterButton}>
          <Ionicons name="options-outline" size={25} color="#fff" />
        </TouchableOpacity>
      </View>

      {totalFound !== null && (
        <Text style={styles.vacancyCount}>
          {totalFound.toLocaleString('ru-RU')} вакансии
        </Text>
      )}
      {isDefaultView && (
  <View
  style={{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  }}
>
  <Text style={[styles.vacancyCount, { fontSize: 18, fontWeight: '600' }]}>
    {lastUsedQuery === 'разработчик' ? 'Популярные вакансии' : 'Вакансии для вас'}
  </Text>
  <TouchableOpacity
      onPress={() => setApplyAllModalVisible(true)}
      style={{
        backgroundColor: '#007BFF',
        padding: 15,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -25,
        marginRight: 10,
      }}
    >
      <Ionicons name="send" size={25} color="#fff" />
    </TouchableOpacity>
</View>
)}

      {/* Модальное окно фильтров */}
      <Modal
        isVisible={filterVisible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={styles.modal}
        onBackdropPress={() => setFilterVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={() => setFilterVisible(false)} style={styles.backButton}>
              <Text style={styles.backButtonText}>Назад</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Фильтры поиска</Text>

            <TextInput
              style={styles.input}
              placeholder="Должность, ключевые слова"
              placeholderTextColor="#ccc"
              value={query}
              onChangeText={setQuery}
            />

            <TextInput
              style={styles.input}
              placeholder="Уровень дохода от"
              placeholderTextColor="#ccc"
              value={salaryFrom}
              onChangeText={handleSalaryChange}
              keyboardType="numeric"
            />

            <View style={styles.switchRow}>
              <Text style={styles.labelSmall}>Указан доход</Text>
              <Switch value={onlyWithSalary} onValueChange={setOnlyWithSalary} />
            </View>

            <Text style={styles.labelExperience}>Города / регионы</Text>

<View style={[styles.input, { paddingHorizontal: 10, paddingVertical: 12 }]}>
  <TextInput
    style={{ color: '#fff', fontSize: 16 }}
    placeholder="Начните вводить город или регион"
    placeholderTextColor="#888"
    value={citySearchQuery}
    onChangeText={setCitySearchQuery}
  />
</View>

{/* Список выбранных */}
{selectedCities.length > 0 && (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
    {selectedCities.map((city) => (
      <View
        key={city.id}
        style={{
          backgroundColor: '#333',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
          margin: 4,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', marginRight: 6 }}>{city.name}</Text>
        <TouchableOpacity onPress={() => toggleCitySelection(city)}>
          <Ionicons name="close" size={16} color="#aaa" />
        </TouchableOpacity>
      </View>
    ))}
  </View>
)}

{/* Список совпадений — показывать только если что-то введено */}
{citySearchQuery.trim().length > 0 && (
  <ScrollView style={{ maxHeight: 200, marginBottom: 15 }}>
    {russianCities
      .filter((c) =>
        c.name.toLowerCase().includes(citySearchQuery.toLowerCase())
      )
      .map((city) => {
        const isSelected = selectedCities.some((c) => c.id === city.id);
        return (
          <TouchableOpacity
            key={city.id}
            onPress={() => toggleCitySelection(city)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 10,
              backgroundColor: isSelected ? '#333' : 'transparent',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>{city.name}</Text>
          </TouchableOpacity>
        );
      })}
  </ScrollView>
)}

            <Text style={styles.labelExperience}>Опыт работы</Text>
            <ScrollView
              style={styles.experienceContainer}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {[{ label: 'Нет опыта', value: 'noExperience' }, { label: 'От 1 года до 3 лет', value: 'between1And3' }, { label: 'От 3 до 6 лет', value: 'between3And6' }, { label: 'Более 6 лет', value: 'moreThan6' }]
                .map((exp) => (
                  <TouchableOpacity
                    key={exp.value}
                    onPress={() => handleExperienceChange(exp.value)}
                    style={[styles.expButton, experience === exp.value && styles.expButtonActive]}
                  >
                    <Text
                      style={[styles.expButtonText, experience === exp.value && styles.expButtonTextActive]}
                    >
                      {exp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </ScrollView>
          <TouchableOpacity onPress={handleApplyFilters} style={styles.applyButton}>
            <Text style={styles.applyButtonTextModal}>Показать вакансии</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
  isVisible={searchModalVisible}
  animationIn="slideInUp"
  animationOut="slideOutDown"
  swipeDirection="down"
  onSwipeComplete={() => setSearchModalVisible(false)}
  onBackdropPress={() => setSearchModalVisible(false)}
  style={{ justifyContent: 'flex-end', margin: 0 }}
>
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    style={{
      height: '90%',
      backgroundColor: '#1E1E1E',
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      padding: 20,
      paddingTop: 50,
    }}
  >
    <GestureHandlerRootView>
      {/* Линия свайпа */}
      <View style={{ alignItems: 'center', marginBottom: 40, marginTop: -30 }}>
        <View
          style={{
            width: 50,
            height: 5,
            borderRadius: 3,
            backgroundColor: '#666',
          }}
        />
      </View>
      {/* Кнопка X */}
      <TouchableOpacity
        style={{ position: 'absolute', top: -5, right: 0, zIndex: 1 }}
        onPress={() => setSearchModalVisible(false)}
      >
        <Ionicons name="close" size={26} color="#fff" />
      </TouchableOpacity>

      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 20, marginTop: -20 }}>
        Поиск
      </Text>

      <View style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}>
  <Ionicons name="search" size={22} color="#888" style={{ marginRight: 10 }} />
  <TextInput
    ref={inputRef}
    placeholder="Должность, ключевые слова"
    placeholderTextColor="#888"
    value={query}
    onChangeText={setQuery}
    onSubmitEditing={() => {
      setSearchModalVisible(false);
      handleSearch(0);
    }}
    style={{ flex: 1, color: '#fff', fontSize: 16, padding: 0 }}
    returnKeyType="search"
    autoFocus
  />
</View>

{searchHistory.length > 0 && (
  <View style={{ marginTop: 25 }}>
    {/* Линия-разделитель */}
    <View
      style={{
        height: 1,
        backgroundColor: '#333',
        width: '100%',
        marginBottom: 15,
      }}
    />

    <Text style={{ color: '#ccc', fontSize: 16, marginBottom: 3 }}>
      История поиска
    </Text>

    {searchHistory.map((item, i) => (
      <TouchableOpacity
        key={i}
        onPress={() => {
          setQuery(item);
          setSearchModalVisible(false);
          handleSearch(0, false, item);
        }}
        style={{ paddingVertical: 20 }} // ← больше отступ
      >
        <Text style={{ color: '#fff', fontSize: 17 }}>{item}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}

    </GestureHandlerRootView>
  </KeyboardAvoidingView>
</Modal>

      {/* Результаты поиска */}
{loading ? (
  <Text style={styles.loadingText}>Загрузка...</Text>
) : (
  <View style={styles.results}>
    {error ? (
      <Text style={styles.noVacanciesText}>{error}</Text>
    ) : (
      <>
        {vacancies.length > 0 ? (
          <>
          {vacancies.map((vacancy, index) => {
            const salary = vacancy.salary;
            let salaryText = '';

            if (salary) {
              const formatNumber = (num: number) =>
                num.toLocaleString('ru-RU', { useGrouping: true });
            
              const currencyMap: Record<string, string> = {
                RUR: '₽',
                RUB: '₽',
                USD: '$',
                EUR: '€',
              };
            
              const currency = typeof salary.currency === 'string' ? salary.currency : '';
              const currencySymbol = currencyMap[currency] || currency;
            
              if (salary.from && salary.to) {
                salaryText = `${formatNumber(salary.from)} – ${formatNumber(salary.to)} ${currencySymbol} за месяц`;
              } else if (salary.from) {
                salaryText = `от ${formatNumber(salary.from)} ${currencySymbol} за месяц`;
              } else if (salary.to) {
                salaryText = `до ${formatNumber(salary.to)} ${currencySymbol} за месяц`;
              }
            }            

            const experienceMap: Record<string, string> = {
              noExperience: 'без опыта',
              between1And3: 'от 1 до 3 лет',
              between3And6: 'от 3 до 6 лет',
              moreThan6: 'более 6 лет',
            };

            const publishedDate = new Date(vacancy.published_at);
const today = new Date();
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);

let formattedDate = '';

const isSameDay = (d1: Date, d2: Date) =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();

if (isSameDay(publishedDate, today)) {
  formattedDate = 'сегодня';
} else if (isSameDay(publishedDate, yesterday)) {
  formattedDate = 'вчера';
} else {
  formattedDate = publishedDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
}
            const isFavorite = favoriteVacancies.some((vac: any) => vac.id === vacancy.id);

            return (
              <View key={`${vacancy.id}_${index}`} style={styles.vacancyItem}>
                <View style={styles.vacancyRow}>
                  <View style={styles.vacancyDetailsContainer}>
                    <Text style={styles.vacancyTitle}>{vacancy.name}</Text>

                    {salaryText && (
                      <Text style={styles.vacancySalary}>{salaryText}</Text>
                    )}

                    <Text style={styles.vacancyEmployer}>
                      {vacancy.employer?.name}
                      {vacancy.employer?.trusted && (
                        <View style={[styles.trustedIconContainer, { marginLeft: 10 }]}>
                          <Ionicons name="shield" size={18} color="#007BFF" />
                          <Ionicons
                            name="checkmark"
                            size={10}
                            color="#2A2A2A"
                            style={[styles.checkmarkInsideShield, { fontWeight: '500' }]}
                          />
                        </View>
                      )}
                    </Text>

                    <Text style={styles.vacancyLocation}>
  {selectedCityId && selectedCityId !== vacancy.area?.id
    ? `${russianCities.find(c => c.id === selectedCityId)?.name || 'Регион'} · ${vacancy.area?.name}`
    : vacancy.area?.name}
</Text>
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

                    <Text style={styles.publishDate}>Опубликовано {formattedDate}</Text>
                  </View>

                  <View style={styles.vacancyRightColumn}>
                    <TouchableOpacity onPress={() => toggleFavorite(vacancy.id)} style={styles.heartButton}>
                      <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={26}
                        color={isFavorite ? 'red' : '#FFF'}
                      />
                    </TouchableOpacity>
                    {vacancy.employer?.logo_urls?.original && (
                      <Image
                        source={{ uri: vacancy.employer.logo_urls.original }}
                        style={styles.logo}
                      />
                    )}
                  </View>
                </View>

                {appliedVacancyIds.has(vacancy.id) ? (
  <TouchableOpacity
  style={[styles.respondButton, { backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }]}
  disabled
>
  <Ionicons name="alert-circle" size={18} color="#00BFFF" style={{ marginRight: 8 }} />
  <Text style={{ color: '#00BFFF', fontSize: 16, fontWeight: '600' }}>
    Вы откликнулись
  </Text>
</TouchableOpacity>
) : (
  <TouchableOpacity
    style={styles.respondButton}
    onPress={() => setApplyAllModalVisible(true)}
  >
    <Text style={styles.respondButtonText}>Откликнуться</Text>
  </TouchableOpacity>
)}
              </View>
            );
          })}
          {/* Скелет-загрузка при подгрузке следующих страниц */}
    {isLoadingMore && (
      <View style={styles.vacancyItem}>
        <View style={{
          height: 100,
          backgroundColor: '#2A2A2A',
          borderRadius: 20,
          opacity: 0.7,
        }} />
      </View>
    )}
  </>
        ) : (
            <Text style={styles.noVacanciesText}>По вашему запросу не найдены вакансии.</Text>
        )}
      </>
    )}
  </View>
)}
  
      </ScrollView>
      <Modal
  isVisible={applyingProgress !== null}
  backdropOpacity={0.7}
  animationIn="fadeIn"
  animationOut="fadeOut"
  backdropTransitionOutTiming={0}
  style={{ justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}
>
  <View style={{ backgroundColor: '#1E1E1E', padding: 30, borderRadius: 20, alignItems: 'center', width: '80%' }}>
    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
      Отклик на вакансии
    </Text>
    <Text style={{ color: '#ccc', fontSize: 16, marginBottom: 10 }}>
      {applyingProgress} из {totalToApply} отправлено
    </Text>
    <TouchableOpacity
      onPress={() => {
        shouldCancelApplyRef.current = true;
        setTimeout(() => {
          setApplyingProgress(null);
          setTotalToApply(0);
        }, 200);
      }}
      style={{ backgroundColor: '#F44336', padding: 10, borderRadius: 10, marginTop: 20 }}
    >
      <Text style={{ color: '#fff', fontWeight: '600' }}>Отменить</Text>
    </TouchableOpacity>
  </View>
</Modal>
<Modal
  isVisible={applyAllModalVisible}
  onBackdropPress={() => {
    if (applyingProgress === null) setApplyAllModalVisible(false);
  }}
  swipeDirection={applyingProgress === null ? 'down' : undefined}
  onSwipeComplete={() => {
    if (applyingProgress === null) setApplyAllModalVisible(false);
  }}
  animationIn="fadeInUp"
  animationOut="fadeOutDown"
  style={{ justifyContent: 'flex-end', margin: 0 }}
>
<View style={{ alignItems: 'center', marginBottom: 10 }}>
  <View
    style={{
      width: 60,
      height: 5,
      borderRadius: 3,
      backgroundColor: '#666',
      marginTop: 10,
    }}
  />
</View>
  <View style={{ backgroundColor: '#1E1E1E', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 }}>
    
    {/* Заголовок с крестиком в одной строке */}
    <View style={{ position: 'relative', justifyContent: 'center', alignItems: 'center', marginBottom: 0, height: 40 }}>
  <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', position: 'absolute', left: 0, right: 0, textAlign: 'center' }}>
    Автоотклик на вакансии
  </Text>
  <TouchableOpacity
    onPress={() => setApplyAllModalVisible(false)}
    style={{ position: 'absolute', right: 0 }}
  >
    <Ionicons name="close" size={24} color="#fff" />
  </TouchableOpacity>
</View>


    {/* Кол-во вакансий */}
    <Text style={{ color: '#999', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
      20 вакансий
    </Text>

    {/* Разделительная линия */}
    <View style={{ height: 1, backgroundColor: '#333', width: '100%', marginBottom: 25 }} />

    {/* Резюме: фото и инфа */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25 }}>
      {resume?.photo?.small ? (
        <Image
          source={{ uri: resume.photo.small }}
          style={{ width: 50, height: 50, borderRadius: 25, marginRight: 15 }}
        />
      ) : (
        <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', marginRight: 15 }} />
      )}
      <View>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          {resume?.title || 'Мое резюме'}
        </Text>
        <Text style={{ color: '#888', fontSize: 14 }}>{resume?.area?.name || 'Город не указан'}</Text>
      </View>
    </View>

    {/* Контент */}
    {applyingProgress !== null ? (
  <View style={{ marginTop: 30 }}>
    {/* Прогрессбар с числом */}
    <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        {applyingProgress}/{totalToApply} отправлено
      </Text>
      <View
        style={{
          width: '100%',
          height: 12,
          backgroundColor: '#333',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${(applyingProgress / totalToApply) * 100}%`,
            height: '100%',
            backgroundColor: '#28a745',
            borderRadius: 10,
          }}
        />
      </View>
      {lastAppliedCompany && (
  <Text style={{ color: '#ccc', fontSize: 15, marginTop: 8 }}>
    Отправлено: {lastAppliedCompany}
  </Text>
)}
      {nextDelaySeconds !== null && (
    <Text style={{ color: '#aaa', fontSize: 15, marginTop: 15 }}>
      Следующий отклик через {nextDelaySeconds} сек...
    </Text>
  )}
  
    </View>

    {/* Кнопка отмены */}
    <TouchableOpacity
      onPress={() => {
        shouldCancelApplyRef.current = true;
        setTimeout(() => {
          setApplyingProgress(null);
          setTotalToApply(0);
          setApplyAllModalVisible(false);
        }, 200);
      }}
      style={{
        marginTop: 10,
        backgroundColor: '#F44336',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Отменить</Text>
    </TouchableOpacity>
  </View>
) : (
  <>
    {/* Твои кнопки до отклика */}
    <TouchableOpacity
      style={{
        backgroundColor: '#007BFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
      }}
      onPress={handleApplyToAll}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Откликнуться на все</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={{
        backgroundColor: '#2c2c2c',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
      }}
      onPress={() => setApplyAllModalVisible(false)}
    >
      <Text style={{ color: '#007BFF', fontSize: 16, fontWeight: '600' }}>Отменить</Text>
    </TouchableOpacity>
  </>
)}
  </View>
</Modal>
      </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 15,
    paddingTop: 10,
    },
  searchPanel: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 13,
    padding: 8,
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 0.5,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
    fontSize: 18,
  },
  searchButton: {
    padding: 5,
  },
  filterButton: {
    marginLeft: 10,
    backgroundColor: '#444444',
    padding: 15,
    borderRadius: 12,
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    minHeight: '100%',
    paddingTop: 70,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 15,
  },
  backButtonText: {
    color: '#007BFF',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#2A2A2A',
    color: '#fff',
    padding: 20,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 0.5,
    borderRadius: 15,
    marginBottom: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  labelSmall: {
    fontSize: 14,
    color: '#fff',
  },
  experienceContainer: {
    marginBottom: 15,
  },
  expButton: {
    backgroundColor: '#3a3a3a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  expButtonActive: {
    backgroundColor: '#fff',
  },
  expButtonText: {
    color: '#fff',
  },
  expButtonTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    marginTop: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  results: {
    marginTop: 10,
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
    marginBottom: 8,
  },
  vacancyDetails: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  vacancyLocation: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  vacancyCount: {
  color: '#ccc',
  fontSize: 14,
  marginBottom: 10,
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
    color: '#ccc',
    fontSize: 14,
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
  noVacanciesText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  labelExperience: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  trustedIconContainer: {
    position: 'relative', // Чтобы разместить иконки поверх друг друга
    marginTop: 6, // Сдвигаем вниз
    marginLeft: 10,
  },
  checkmarkInsideShield: {
    position: 'absolute', // Абсолютное позиционирование внутри контейнера
    top: 4, // Сдвигаем чуть вниз, чтобы разместить чекмарк в центре щита
    left: 4, // Сдвигаем влево, чтобы разместить чекмарк внутри щита
    fontWeight: '900',
  },
  applyButtonWrapper: {
    backgroundColor: '#007BFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 180,
    height: 40,
    overflow: 'hidden',
    marginBottom: 20,
  },
  
  applyButtonTextModal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  progressBar: {
    backgroundColor: '#28a745',
  },

  fixedBottomButton: {
    position: 'absolute',
    bottom: 0, // или чуть больше, если tab-бар выше
    left: 15,
    right: 15,
    zIndex: 100,
  },

  floatingButton: {
    position: 'absolute',
    bottom: 60, // выше tabBar
    left: '50%',
    marginLeft: -30,
    backgroundColor: '#007BFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8, // Android
    zIndex: 9999, // выше tabBar
  },
});
