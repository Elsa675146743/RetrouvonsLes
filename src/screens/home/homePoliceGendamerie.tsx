import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomePoliceGendamerie({ level }: { level: number }) {
  return (
    <View style={styles.container}>
      <View style={[styles.header, {backgroundColor: '#1B86EA'}]}>
        <Text style={styles.title}>Poste de Commandement</Text>
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={[styles.button, {borderColor:'#1B86EA', borderLeftWidth:5}]}><Text>🚨 DÉCLENCHER ALERTE NATIONALE</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button}><Text>🕵️ Accès Base de Données Criminelle</Text></TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  button: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});