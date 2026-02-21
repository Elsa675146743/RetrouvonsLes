import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeSuperAdmin({ level }: { level: number }) {
  return (
    <View style={styles.container}>
      <View style={[styles.header, {backgroundColor: '#D32F2F'}]}>
        <Text style={styles.title}>SUPER ADMIN PANEL</Text>
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={styles.button}><Text>⚙️ Configuration du Système</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button}><Text>📊 Logs et Statistiques Globales</Text></TouchableOpacity>
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