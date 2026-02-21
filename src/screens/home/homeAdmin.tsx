import { StyleSheet, Text, View } from "react-native";
export default function HomeAdmin({ level }: { level: number }) {
  return (
    <View style={{flex:1}}>
      <View style={{padding:40, backgroundColor:'#455A64'}}><Text style={{color:'#FFF'}}>Admin Unité</Text></View>
      <View style={{padding:20}}><Text>Gérer les comptes des agents</Text></View>
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