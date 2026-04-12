import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Dons = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.info}>Soutenez les initiatives locales</Text>
      <TouchableOpacity style={styles.donateBtn}>
        <Text style={styles.btnText}>Faire un don</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  info: { fontSize: 18, textAlign: 'center', marginBottom: 30 },
  donateBtn: { backgroundColor: '#6c5ce7', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default Dons;