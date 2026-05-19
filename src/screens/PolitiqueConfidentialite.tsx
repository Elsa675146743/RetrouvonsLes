import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SECTIONS = [
  {
    titre: '1. Collecte des données',
    icone: 'document-text-outline',
    contenu: `RetrouvonsLes collecte uniquement les données nécessaires au fonctionnement de la plateforme :
• Nom, prénom, adresse email et numéro de téléphone lors de l'inscription
• Photos uploadées dans le cadre de signalements ou de dossiers de disparition
• Position géographique (avec votre consentement explicite) pour les alertes de proximité
• Historique des signalements et interactions avec la plateforme

Nous ne collectons aucune donnée à des fins commerciales ou publicitaires.`,
  },
  {
    titre: '2. Utilisation des données',
    icone: 'shield-checkmark-outline',
    contenu: `Vos données sont utilisées exclusivement pour :
• Faciliter la recherche de personnes disparues au Cameroun
• Envoyer des alertes géolocalisées aux utilisateurs proches d'une zone de disparition
• Permettre aux autorités accréditées (police, gendarmerie, ONG) d'accéder aux dossiers pertinents
• Améliorer les algorithmes de reconnaissance et de prédiction de localisation

Vos données ne sont jamais vendues, louées ou partagées avec des tiers à des fins commerciales.`,
  },
  {
    titre: '3. Partage des données',
    icone: 'people-outline',
    contenu: `Vos données peuvent être partagées avec :
• Les autorités camerounaises accréditées (Police Nationale — 117, Gendarmerie Nationale — 113) dans le cadre d'enquêtes officielles
• Les ONG partenaires disposant d'une accréditation validée par notre équipe
• Notre prestataire d'hébergement (Supabase) soumis à des obligations de confidentialité strictes

Tout partage avec les autorités est tracé et auditable.`,
  },
  {
    titre: '4. Sécurité des données',
    icone: 'lock-closed-outline',
    contenu: `Nous mettons en œuvre les mesures suivantes pour protéger vos données :
• Chiffrement des données en transit (HTTPS/TLS)
• Chiffrement des données au repos dans notre base de données
• Authentification sécurisée via Supabase Auth
• Accès aux données sensibles restreint aux utilisateurs accrédités (niveaux 2-7)
• Journalisation complète de tous les accès aux dossiers confidentiels
• Réentraînement des modèles IA sur des données anonymisées`,
  },
  {
    titre: '5. Vos droits',
    icone: 'person-outline',
    contenu: `Conformément aux lois en vigueur, vous disposez des droits suivants :
• Droit d'accès : consulter toutes les données que nous détenons sur vous
• Droit de rectification : corriger des informations inexactes
• Droit à l'effacement : demander la suppression de votre compte et de vos données
• Droit d'opposition : refuser certains traitements (ex : désactiver les notifications)
• Droit à la portabilité : recevoir vos données dans un format lisible

Pour exercer ces droits, contactez-nous à : support@retrouvonsles.com`,
  },
  {
    titre: '6. Photos et reconnaissance faciale',
    icone: 'scan-outline',
    contenu: `Les photos uploadées sur la plateforme sont soumises à des règles strictes :
• Les photos de personnes disparues sont utilisées uniquement pour les recherches
• L'analyse par IA (reconnaissance faciale) est effectuée automatiquement sur les signalements
• Les résultats de l'IA sont toujours validés par un humain accrédité avant toute action
• Les photos ne sont jamais partagées publiquement sans le consentement de la famille
• Les photos vieillies (estimation d'âge) sont générées uniquement pour les dossiers actifs`,
  },
  {
    titre: '7. Géolocalisation',
    icone: 'location-outline',
    contenu: `La géolocalisation est utilisée pour :
• Envoyer des alertes aux utilisateurs proches d'une zone de disparition
• Améliorer les prédictions de localisation des personnes disparues
• Afficher les alertes sur la carte interactive

La géolocalisation est toujours optionnelle. Vous pouvez la désactiver dans les paramètres de votre téléphone. Sans position, vous recevrez les alertes nationales avec une priorité standard.`,
  },
  {
    titre: '8. Conservation des données',
    icone: 'time-outline',
    contenu: `Durées de conservation :
• Données de compte : conservées tant que le compte est actif + 2 ans après suppression
• Dossiers de disparition : conservés indéfiniment (valeur historique et légale)
• Signalements : conservés 5 ans après la clôture du dossier
• Logs d'activité : conservés 1 an
• Photos : conservées tant que le dossier est actif, puis archivées

Vous pouvez demander la suppression anticipée de vos données personnelles.`,
  },
  {
    titre: '9. Règles d\'utilisation',
    icone: 'warning-outline',
    contenu: `En utilisant RetrouvonsLes, vous vous engagez à :
• Ne pas soumettre de faux signalements ou de fausses informations
• Ne pas usurper l'identité d'une autorité ou d'un tiers
• Ne pas utiliser la plateforme à des fins de harcèlement ou de surveillance non consentie
• Respecter la dignité des personnes disparues et de leurs familles
• Signaler tout contenu inapproprié ou abusif à notre équipe

Tout abus entraînera la suspension immédiate du compte et pourra faire l'objet de poursuites judiciaires.`,
  },
  {
    titre: '10. Contact et réclamations',
    icone: 'mail-outline',
    contenu: `Pour toute question relative à cette politique :
• Email : support@retrouvonsles.com
• Site web : https://retrouvonsles.vercel.app
• Urgences : Police Nationale 117 | Gendarmerie Nationale 113

Dernière mise à jour : Mai 2026
Cette politique peut être mise à jour. Vous serez notifié de tout changement significatif.`,
  },
];

export default function PolitiqueConfidentialite({ navigation }: any) {
  const [ouvert, setOuvert] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* NAVBAR */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.navTitre}>Politique de confidentialité</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* INTRO */}
        <View style={styles.introBox}>
          <Ionicons name="shield-checkmark" size={32} color="#b45f06" />
          <Text style={styles.introTitre}>RetrouvonsLes</Text>
          <Text style={styles.introSub}>
            Nous nous engageons à protéger vos données personnelles et à les utiliser uniquement pour retrouver des personnes disparues au Cameroun.
          </Text>
        </View>

        {/* SECTIONS ACCORDÉON */}
        {SECTIONS.map((section, index) => (
          <TouchableOpacity
            key={index}
            style={styles.sectionCard}
            onPress={() => setOuvert(ouvert === index ? null : index)}
            activeOpacity={0.8}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name={section.icone as any} size={18} color="#b45f06" />
              </View>
              <Text style={styles.sectionTitre}>{section.titre}</Text>
              <Ionicons
                name={ouvert === index ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#94a3b8"
              />
            </View>
            {ouvert === index && (
              <Text style={styles.sectionContenu}>{section.contenu}</Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.footer}>
          En utilisant RetrouvonsLes, vous acceptez cette politique de confidentialité.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navTitre: { fontSize: 16, fontWeight: '700', color: '#0b1c30', flex: 1, textAlign: 'center' },

  content: { padding: 16, paddingBottom: 40 },

  introBox: {
    alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  introTitre: { fontSize: 20, fontWeight: '800', color: '#0b1c30', marginTop: 10, marginBottom: 8 },
  introSub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  sectionIconBox: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center',
  },
  sectionTitre: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0b1c30' },
  sectionContenu: {
    fontSize: 13, color: '#475569', lineHeight: 20,
    paddingHorizontal: 16, paddingBottom: 16,
  },

  footer: {
    fontSize: 12, color: '#94a3b8', textAlign: 'center',
    marginTop: 8, lineHeight: 17, fontStyle: 'italic',
  },
});
