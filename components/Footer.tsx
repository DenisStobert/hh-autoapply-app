import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

const featherIcons = [
  "search",
  "star",
  "send",
  "message-circle",
  "user",
] as const;

type FeatherIconName = (typeof featherIcons)[number];

interface FooterButtonProps {
  iconName: FeatherIconName;
  label: string;
}

function FooterButton({ iconName, label }: FooterButtonProps) {
  return (
    <TouchableOpacity style={styles.button}>
      <Feather name={iconName} size={24} color="#ccc" />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Footer() {
  return (
    <View style={styles.footer}>
      <FooterButton iconName="search" label="Поиск" />
      <FooterButton iconName="star" label="Избранное" />
      <FooterButton iconName="send" label="Отклики" />
      <FooterButton iconName="message-circle" label="Сообщения" />
      <FooterButton iconName="user" label="Профиль" />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 90,
    backgroundColor: '#222',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  button: {
    alignItems: 'center',
  },
  label: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
});
