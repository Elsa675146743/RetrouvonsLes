import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { createPersonne, getPersonnes } from '../../../services/personneService';

const ListePersonnes = ({ navigation }: any) => {
  const [personnes, setPersonnes]     = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // Charge les personnes depuis Supabase
  const fetchPersonnes = async () => {
    try {
      const data = await getPersonnes(); // ← appelle Supabase
      setPersonnes(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Se déclenche chaque fois qu'on arrive sur cet écran
  // Donc si vous créez une personne et revenez ici, la liste se recharge
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPersonnes();
    }, [])
  );

  // Filtre par nom/prénom (recherche locale)
  const listeFiltered = personnes.filter(item => {
    if (!searchQuery.trim()) return true;
    const nomComplet = `${item.prenom} ${item.nom}`.toLowerCase();
    return nomComplet.includes(searchQuery.toLowerCase());
  });

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.personCard}
      onPress={() => navigation.navigate('DetailPersonne', { data: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.prenom} {item.nom}
        </Text>
      </View>
      <Text style={styles.cardSubtitle}>
        {item.sexe || '—'} • {item.age_estime_min ? `~${item.age_estime_min} ans` : '—'} • {item.nationalite || '—'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <Text style={styles.logoText}>
          Retrouvons <Text style={styles.logoHighlight}>les</Text>
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.pageTitle}>Personnes</Text>

        <View style={styles.actionRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#94a3b8" style={{marginLeft: 12}} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un nom..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{marginRight: 10}}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.btnCreate}
            onPress={() => navigation.navigate('Identite')}
          >
            <Text style={styles.btnCreateText}>Créer</Text>
          </TouchableOpacity>
        </View>

        {/* Affichage conditionnel selon l'état */}
        {loading ? (
          // Chargement en cours
          <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 60}} />
        ) : (
          // Liste chargée
          <FlatList
            data={listeFiltered}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
            refreshControl={
              // Glisser vers le bas pour recharger
              <RefreshControl refreshing={refreshing} onRefresh={() => {
                setRefreshing(true);
                fetchPersonnes();
              }} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `Aucun résultat pour "${searchQuery}"`
                  : 'Aucune personne enregistrée.'}
              </Text>
            }
          />
        )}

        <View style={styles.paginationContainer}>
          <Text style={styles.pagInfo}>{listeFiltered.length} résultat(s)</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Gardez exactement vos styles existants, rien ne change
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { height: 65, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  logoText: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  logoHighlight: { color: '#ef4444' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  pageTitle: { fontSize: 26, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 10, height: 48 },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#1e293b' },
  btnCreate: { backgroundColor: '#2563eb', paddingHorizontal: 15, height: 48, borderRadius: 10, justifyContent: 'center' },
  btnCreateText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  columnWrapper: { justifyContent: 'space-between' },
  personCard: { backgroundColor: '#FFF', width: '48%', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  cardHeader: { marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cardSubtitle: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  listPadding: { paddingBottom: 100 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94a3b8', fontSize: 16 },
  paginationContainer: { paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#e2e8f0', alignItems: 'center' },
  pagInfo: { color: '#94a3b8', fontSize: 12 }
});

export default ListePersonnes;