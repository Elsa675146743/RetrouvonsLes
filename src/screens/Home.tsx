import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';


// Importation de tes fichiers depuis le dossier 'home'
import HomeCitoyenVerifierStandard from './home/homeCitoyenVerifierStandard';
import HomeOperateurSaisie from './home/homeOperateurSaisie';
import HomeModerateur from './home/homeModerateur';
import HomePoliceGendarmerie from './home/homePolice';
import HomeResponsableONG from './home/homeResponsableONG';
import HomeAdmin from './home/homeAdmin';
import HomeSuperAdmin from './home/homeSuperAdmin';

const Home = () => {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    const loadLevel = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLevel(0); // sécurité
        return;
      }

      const { level } = await authService.getUserRole(user.id);
      setLevel(level);
    };

    loadLevel();
  }, []);


  // --- LOGIQUE D'AFFICHAGE AVEC TRANSMISSION DU NIVEAU ---
  // On ajoute level={level} pour que chaque sous-page puisse gérer ses restrictions
  switch (level) {
    case 0:
    case 1:
      return <HomeCitoyenVerifierStandard level={level} />;
    case 2:
      return <HomeOperateurSaisie level={level} navigation={undefined} />;
    case 3:
      return <HomeModerateur level={level} />;
    case 4:
      return <HomePoliceGendarmerie level={level} />;
    case 5:
      return <HomeResponsableONG level={level} />;
    case 6:
      return <HomeAdmin level={level} />;
    case 7:
      return <HomeSuperAdmin level={level} />;
    default:
      return <HomeCitoyenVerifierStandard level={0} />;
  }
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default Home;