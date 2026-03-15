import React from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, Image
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const DetailPersonne = ({ route, navigation }: any) => {
  // Récupération des données consolidées
  const data = route.params?.data || {};

  // Composant réutilisable pour les petites cartes d'information
  const InfoCard = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <View style={styles.infoCard}>
      <Text style={styles.cardLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.cardValue}>{value || "—"}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER AVEC LOGO */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Retrouvons <Text style={styles.logoHighlight}>les</Text></Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* BANNIÈRE DE TITRE ET ACTIONS */}
        <View style={styles.topBanner}>
          <View>
            <Text style={styles.personName}>{data.prenom} {data.nom}</Text>
            <Text style={styles.personSub}>{data.sexe || 'sexe non défini'} • {data.nationalite || 'Nationalité inconnue'}</Text>
          </View>
          <View style={styles.bannerButtons}>
            {/* NAVIGATION AJOUTÉE ICI SANS CHANGER LE STYLE */}
            <TouchableOpacity 
              style={styles.btnAction}
              onPress={() => navigation.navigate('personne', { personData: data })}
            >
              <Text style={styles.btnActionText}>Créer un dossier avec cette personne</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.btnList} 
              onPress={() => navigation.navigate('ListePersonnes')}
            >
              <Text style={styles.btnListText}>Retour liste</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION IDENTITÉ */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Identité</Text>
          <View style={styles.grid}>
            <InfoCard label="Nom" value={data.nom} />
            <InfoCard label="Prénom" value={data.prenom} />
            <InfoCard label="Nom Complet" value={`${data.prenom} ${data.nom}`} />
            <InfoCard label="Alias" value={data.alias} />
            <InfoCard label="Sexe" value={data.sexe} />
            <InfoCard label="Date de naissance" value={data.dateLabel} />
            <InfoCard label="Âge Estimé" value={data.ageMin && data.ageMax ? `${data.ageMin} - ${data.ageMax}` : data.age} />
            <InfoCard label="Nationalité" value={data.nationalite} />
            <InfoCard label="Langue(s) parlée(s)" value={data.langue} />
            <InfoCard label="N° Identification" value={data.numeroIdentification} />
            <InfoCard label="Type Identification" value={data.typePiece} />
            <InfoCard label="Situation familiale" value={data.situationFamiliale} />
            <InfoCard label="Nombre d'enfants" value={data.nombreEnfants} />
          </View>
        </View>

        {/* SECTION DESCRIPTION PHYSIQUE */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Description physique</Text>
          <View style={styles.grid}>
            <InfoCard label="Taille (cm)" value={data.taille} />
            <InfoCard label="Poids (kg)" value={data.poids} />
            <InfoCard label="Corpulence" value={data.corpulence} />
            <InfoCard label="Couleur de peau" value={data.couleurPeau} />
            <InfoCard label="Couleur des cheveux" value={data.couleurCheveux} />
            <InfoCard label="Type cheveux" value={data.typeCheveux} />
            <InfoCard label="Couleur des yeux" value={data.couleurYeux} />
            <InfoCard label="Signes distinctifs" value={data.signesDistinctifs} />
            <InfoCard label="Handicaps / Maladies" value={data.handicaps} />
            <InfoCard label="Groupe Sanguin" value={data.groupeSanguin} />
            <InfoCard label="Derniers vêtements" value={data.derniersVetements} />
            <InfoCard label="Accessoires" value={data.accessoires} />
          </View>
          
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardLabel}>DESCRIPTION PHYSIQUE (TEXTE)</Text>
            <Text style={styles.cardValueText}>{data.descriptionPhysique || "Aucune description détaillée."}</Text>
          </View>
        </View>

        {/* SECTION DOSSIERS LIÉS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Dossiers liés</Text>
          <View style={styles.emptyDossier}>
            <Text style={styles.emptyText}>Aucun dossier lié pour l'instant.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { height: 65, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  logoText: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  logoHighlight: { color: '#ef4444' },
  scrollContent: { padding: 15 },
  
  // Bannière du haut
  topBanner: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  personName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  personSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  bannerButtons: { flexDirection: 'row', marginTop: 10 },
  btnAction: { backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
  btnActionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  btnList: { borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnListText: { color: '#1e293b', fontSize: 12, fontWeight: 'bold' },

  // Sections
  sectionContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  
  // Cartes d'info
  infoCard: { width: '31%', backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', minHeight: 60 },
  fullWidthCard: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 5 },
  cardLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginBottom: 4 },
  cardValue: { fontSize: 13, color: '#1e293b', fontWeight: '700' },
  cardValueText: { fontSize: 13, color: '#1e293b', lineHeight: 18 },

  // Dossiers
  emptyDossier: { padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  emptyText: { color: '#64748b', fontSize: 14, fontStyle: 'italic' }
});

export default DetailPersonne;