import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Dimensions, StatusBar,
  ActivityIndicator, RefreshControl, Modal
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getDossiers } from '../../../services/dossierService';

const { width } = Dimensions.get('window');

// =====================================================
// PICKER MODAL — EN DEHORS DE Dossiers (obligatoire)
// =====================================================
const PickerModal = ({ visible, onClose, options, selected, onSelect, title }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={pStyles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={pStyles.modalContent}>
        <Text style={pStyles.modalTitle}>{title}</Text>
        {options.map((opt: any) => (
          <TouchableOpacity
            key={opt.value}
            style={[pStyles.modalItem, selected === opt.value && pStyles.modalItemActive]}
            onPress={() => { onSelect(opt.value); onClose(); }}
          >
            <Text style={[
              pStyles.modalItemText,
              selected === opt.value && pStyles.modalItemTextActive
            ]}>
              {opt.label}
            </Text>
            {selected === opt.value && (
              <Ionicons name="checkmark" size={16} color="#2563eb" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
const Dossiers = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery]           = useState('');
  const [dossiers, setDossiers]                 = useState<any[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [filtreStatut, setFiltreStatut]         = useState('tous');
  const [filtreTri, setFiltreTri]               = useState('recent');
  const [showStatutPicker, setShowStatutPicker] = useState(false);
  const [showTriPicker, setShowTriPicker]       = useState(false);

  const statutOptions = [
    { label: 'Tous les statuts', value: 'tous' },
    { label: 'En cours',         value: 'en_cours' },
    { label: 'Retrouvé Vivant',  value: 'retrouve_vivant' },
    { label: 'Retrouvé Décédé',  value: 'retrouve_decede' },
    { label: 'Suspendu',         value: 'suspendu' },
  ];

  const triOptions = [
    { label: 'Récent', value: 'recent' },
    { label: 'Urgent', value: 'urgent' },
  ];

  const getLabelStatut = () =>
    statutOptions.find(o => o.value === filtreStatut)?.label || 'Tous les statuts';

  const getLabelTri = () =>
    triOptions.find(o => o.value === filtreTri)?.label || 'Récent';

  const fetchDossiers = async () => {
    try {
      const data = await getDossiers();
      setDossiers(data || []);
    } catch (error) {
      console.error('Erreur chargement dossiers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDossiers();
    }, [])
  );

  // Filtrage + tri
  const filteredDossiers = dossiers
    .filter(d => {
      if (filtreStatut === 'tous') return true;
      return d.statut_dossier === filtreStatut;
    })
    .filter(d =>
      d.numero_dossier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ville_disparition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.lieu_disparition?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (filtreTri === 'urgent') {
        const ordre: Record<string, number> = {
          critique: 0, urgent: 1, normal: 2, faible: 3,
        };
        return (ordre[a.niveau_urgence] ?? 2) - (ordre[b.niveau_urgence] ?? 2);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const getUrgenceStyle = (urgence: string) => {
    const map: Record<string, { bg: string; text: string; icon: string }> = {
      critique: { bg: '#fee2e2', text: '#991b1b', icon: 'alert-circle' },
      urgent:   { bg: '#fef3c7', text: '#92400e', icon: 'warning' },
      normal:   { bg: '#f0fdf4', text: '#166534', icon: 'checkmark-circle' },
      faible:   { bg: '#f1f5f9', text: '#64748b', icon: 'ellipse-outline' },
    };
    return map[urgence] || map['normal'];
  };

  const getStatutStyle = (statut: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      en_cours:          { bg: '#fef3c7', text: '#92400e' },
      retrouve_vivant:   { bg: '#f0fdf4', text: '#166534' },
      retrouve_decede:   { bg: '#fee2e2', text: '#991b1b' },
      suspendu:          { bg: '#f1f5f9', text: '#64748b' },
      classe_sans_suite: { bg: '#f1f5f9', text: '#64748b' },
    };
    return map[statut] || { bg: '#fef3c7', text: '#92400e' };
  };

  const handleModifier = (item: any) => {
    navigation.navigate('ModifierDossier', {
      dossierId:     item.id,
      numeroDossier: item.numero_dossier,
      initialData: {
        dateLabel:       item.date_disparition
          ? new Date(item.date_disparition).toLocaleDateString('fr-FR') : '',
        dateISO:         item.date_disparition || '',
        lieu:            item.lieu_disparition || '',
        ville:           item.ville_disparition || '',
        region:          item.region_disparition || '',
        pays:            item.pays_disparition || 'Cameroun',
        circonstances:   item.circonstances || '',
        urgence:         item.niveau_urgence || 'normal',
        typeDisparition: item.type_disparition || 'inconnue',
        statut:          item.statut_dossier || 'en_cours',
        contactNom:      item.contact_famille_principale || '',
        contactTel:      item.telephone_contact || '',
        contactEmail:    item.email_contact || '',
      }
    });
  };

  const renderEmpty = () => {
    const isFiltered  = filtreStatut !== 'tous';
    const statutLabel = getLabelStatut();
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={60} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>
          {isFiltered
            ? `Aucun dossier "${statutLabel}"`
            : searchQuery
              ? `Aucun résultat pour "${searchQuery}"`
              : 'Vous n\'avez pas encore créé de dossier'}
        </Text>
        <Text style={styles.emptySubText}>
          {isFiltered
            ? 'Aucun dossier ne correspond à ce statut pour le moment.'
            : 'Créez votre premier dossier de disparition.'}
        </Text>
        <TouchableOpacity
          style={styles.btnEmptyCreate}
          onPress={() => navigation.navigate('personne')}
        >
          <Ionicons name="add" size={18} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.btnEmptyCreateText}>
            {isFiltered ? 'Créer un dossier' : 'Créer mon premier dossier'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* HEADER */}
      <View style={styles.appHeader}>
        <View style={styles.appHeaderLeft}>
          <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
          <Text style={styles.appTitle}>RetrouvonsLes</Text>
        </View>
        <View style={styles.profileCircle}>
          <Text style={styles.profileInitial}>E</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDossiers(); }}
          />
        }
      >
        {/* TITRE ET BOUTON */}
        <View style={styles.headerRow}>
          <Text style={styles.mainTitle}>Mes dossiers</Text>
          <TouchableOpacity
            style={styles.btnNewDossier}
            onPress={() => navigation.navigate('personne')}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.btnNewDossierText}>Nouveau</Text>
          </TouchableOpacity>
        </View>

        {/* BARRE DE FILTRES */}
        <View style={styles.filterBar}>

          {/* FILTRE STATUT */}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowStatutPicker(true)}
          >
            <Ionicons name="funnel-outline" size={13} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.filterBtnText} numberOfLines={1}>
              {getLabelStatut()}
            </Text>
            <Ionicons name="chevron-down" size={13} color="#64748b" style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          {/* FILTRE TRI */}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowTriPicker(true)}
          >
            <Text style={styles.filterBtnText} numberOfLines={1}>
              Trier: {getLabelTri()}
            </Text>
            <Ionicons name="chevron-down" size={13} color="#64748b" style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          {/* RECHERCHE */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={15} color="#94a3b8" />
            <TextInput
              placeholder="Chercher..."
              style={styles.searchInput}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={15} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* CONTENU */}
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 60 }} />
        ) : filteredDossiers.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            <Text style={styles.counterTop}>
              {filteredDossiers.length} dossier(s)
              {filtreStatut !== 'tous' ? ` — ${getLabelStatut()}` : ''}
            </Text>

            <View style={styles.grid}>
              {filteredDossiers.map((item) => {
                const urgenceStyle = getUrgenceStyle(item.niveau_urgence);
                const statutStyle  = getStatutStyle(item.statut_dossier);
                const nomPersonne  = item.personne
                  ? `${item.personne.prenom || ''} ${item.personne.nom || ''}`.trim()
                  : 'Personne inconnue';

                return (
                  <View key={item.id} style={styles.card}>

                    {/* Header carte */}
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardId} numberOfLines={1}>
                        {item.numero_dossier || item.id.slice(-8).toUpperCase()}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statutStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statutStyle.text }]}>
                          {item.statut_dossier?.replace(/_/g, ' ') || 'en cours'}
                        </Text>
                      </View>
                    </View>

                    {/* Corps carte */}
                    <View style={styles.cardBody}>
                      <View style={styles.infoLine}>
                        <Ionicons name="location-outline" size={12} color="#64748b" />
                        <Text style={styles.infoText} numberOfLines={1}>
                          {item.ville_disparition || item.lieu_disparition || '—'}
                        </Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Ionicons name="calendar-outline" size={12} color="#64748b" />
                        <Text style={styles.infoText}>
                          {item.date_disparition
                            ? new Date(item.date_disparition).toLocaleDateString('fr-FR')
                            : '—'}
                        </Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Ionicons
                          name={urgenceStyle.icon}
                          size={12}
                          color={urgenceStyle.text}
                        />
                        <Text style={[styles.infoText, { color: urgenceStyle.text, fontWeight: '600' }]}>
                          {item.niveau_urgence
                            ? item.niveau_urgence.charAt(0).toUpperCase() + item.niveau_urgence.slice(1)
                            : '—'}
                        </Text>
                      </View>
                      {item.circonstances && (
                        <Text style={styles.circonstances} numberOfLines={2}>
                          {item.circonstances}
                        </Text>
                      )}
                    </View>

                    {/* Footer carte */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.createdAt}>
                        Créé le {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('fr-FR')
                          : '—'}
                      </Text>
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.btnVoir}
                          onPress={() => navigation.navigate('DetailsDossier', {
                            dossierId:     item.numero_dossier,
                            dossierIdReal: item.id,
                            personData:    item.personne,
                            dataDisparition: {
                              dateLabel:       item.date_disparition
                                ? new Date(item.date_disparition).toLocaleDateString('fr-FR') : '',
                              lieu:            item.lieu_disparition,
                              ville:           item.ville_disparition,
                              region:          item.region_disparition,
                              urgence:         item.niveau_urgence,
                              typeDisparition: item.type_disparition,
                              circonstances:   item.circonstances,
                            },
                          })}
                        >
                          <Ionicons name="eye-outline" size={13} color="#2563eb" />
                          <Text style={styles.btnVoirText}>Voir</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnModifier}
                          onPress={() => handleModifier(item)}
                        >
                          <Ionicons name="pencil-outline" size={13} color="#475569" />
                          <Text style={styles.btnModifierText}>Modifier</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

      </ScrollView>

      {/* MODALS PICKERS */}
      <PickerModal
        visible={showStatutPicker}
        onClose={() => setShowStatutPicker(false)}
        options={statutOptions}
        selected={filtreStatut}
        onSelect={setFiltreStatut}
        title="Filtrer par statut"
      />
      <PickerModal
        visible={showTriPicker}
        onClose={() => setShowTriPicker(false)}
        options={triOptions}
        selected={filtreTri}
        onSelect={setFiltreTri}
        title="Trier par"
      />

    </SafeAreaView>
  );
};

// =====================================================
// STYLES PICKER MODAL (séparés car hors composant)
// =====================================================
const pStyles = StyleSheet.create({
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent:        { backgroundColor: '#FFF', borderRadius: 14, padding: 16, width: '80%', elevation: 5 },
  modalTitle:          { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItem:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  modalItemActive:     { backgroundColor: '#eff6ff' },
  modalItemText:       { fontSize: 14, color: '#1e293b' },
  modalItemTextActive: { color: '#2563eb', fontWeight: '600' },
});

// =====================================================
// STYLES PRINCIPAUX
// =====================================================
const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8fafc' },
  appHeader:           { height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  appHeaderLeft:       { flexDirection: 'row', alignItems: 'center' },
  appTitle:            { fontSize: 18, fontWeight: '800', color: '#1e293b', marginLeft: 10 },
  profileCircle:       { width: 35, height: 35, borderRadius: 18, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  profileInitial:      { fontWeight: 'bold', color: '#64748b' },
  scrollContent:       { padding: 16, paddingBottom: 40 },
  headerRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mainTitle:           { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  btnNewDossier:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnNewDossierText:   { color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 13 },

  // Filtres
  filterBar:           { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
  filterBtn:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  filterBtnText:       { fontSize: 11, color: '#1e293b', fontWeight: '600' },
  searchContainer:     { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, height: 38 },
  searchInput:         { flex: 1, fontSize: 12, color: '#1e293b', marginLeft: 5 },

  counterTop:          { fontSize: 12, color: '#94a3b8', marginBottom: 12 },

  // Grille
  grid:                { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card:                { backgroundColor: '#FFF', width: (width - 48) / 2, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginBottom: 16, elevation: 1 },
  cardHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardId:              { fontSize: 10, fontWeight: 'bold', color: '#2563eb', flex: 1, marginRight: 4 },
  statusBadge:         { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20 },
  statusText:          { fontSize: 9, fontWeight: 'bold' },
  cardBody:            { marginBottom: 10 },
  infoLine:            { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  infoText:            { marginLeft: 5, fontSize: 11, color: '#64748b', flex: 1 },
  circonstances:       { fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 15, fontStyle: 'italic' },
  cardFooter:          { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  createdAt:           { fontSize: 10, color: '#94a3b8', marginBottom: 8 },
  cardActions:         { flexDirection: 'row', justifyContent: 'space-between' },
  btnVoir:             { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6, flex: 0.50 },
  btnVoirText:         { color: '#2563eb', fontSize: 11, fontWeight: 'bold', marginLeft: 3 },
  btnModifier:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6, flex: 0.46 },
  btnModifierText:     { color: '#475569', fontSize: 11, fontWeight: 'bold', marginLeft: 3 },

  // Empty
  emptyContainer:      { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyTitle:          { color: '#1e293b', fontSize: 16, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  emptySubText:        { color: '#94a3b8', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 18 },
  btnEmptyCreate:      { marginTop: 24, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  btnEmptyCreateText:  { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});

export default Dossiers;