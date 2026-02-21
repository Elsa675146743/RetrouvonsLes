import React, { useState, useRef } from 'react';
import {
    StyleSheet, View, Text, Image, FlatList, Dimensions, TouchableOpacity, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Signalez une disparition',
        description: 'Publiez une alerte en moins de 2 minutes avec photos et localisation.',
        image: require('../assets/onboarding/slide1.jpg'),
    },
    {
        id: '2',
        title: 'Solidarité Communitaire',
        description: 'Mobilisez les personnes à proximité pour une recherche efficace.',
        image: require('../assets/onboarding/slide2.jpeg'),
    },
    {
        id: '3',
        title: 'Retrouvons-les ensemble',
        description: 'Recevez des signalements en temps réel et sauvez des vies.',
        image: require('../assets/onboarding/slide3.jpeg'),
    },
];

const Onboarding = ({ navigation }: any) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null); // Référence pour contrôler la liste

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    // --- NOUVELLE FONCTION : Gère le clic sur le bouton ---
    const handleNext = async () => {
        const nextIndex = currentIndex + 1;

        // Si on n'est pas à la dernière slide, on avance à la suivante
        if (nextIndex < SLIDES.length) {
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
            });
        } else {
            // Si c'est la dernière, on sauvegarde le flag et on va vers le Login
            try {
                await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            } catch (e) {
                console.log("Erreur sauvegarde onboarding", e);
            }
            navigation.replace('Login');
        }
    };

    const renderItem = ({ item }: any) => (
        <View style={styles.slide}>
            <Image source={item.image} style={styles.image} />
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" />

            <FlatList
                data={SLIDES}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                bounces={false}
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                ref={flatListRef}
            />

            <View style={styles.footer}>
                <View style={styles.indicatorContainer}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[styles.indicator, currentIndex === index && styles.activeIndicator]}
                        />
                    ))}
                </View>


                <TouchableOpacity
                    style={styles.button}
                    onPress={handleNext} // Appelle la fonction de navigation
                >
                    <Text style={styles.buttonText}>
                        {/* On change le texte selon la position */}
                        {currentIndex === SLIDES.length - 1 ? 'COMMENCER' : 'SUIVANT'}
                    </Text>
                </TouchableOpacity>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF'
    },
    slide: {
        width,
        height
    },
    image: {
        width,
        height: height * 0.6,
        resizeMode: 'cover'
    },
    textContainer: {
        padding: 30,
        height: height * 0.4,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1A1A1A',
        textAlign: 'center'
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        marginTop: 15,
        lineHeight: 24
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        alignItems: 'center'

    },
    indicatorContainer: {
        flexDirection: 'row',
        marginBottom: 20
    },
    indicator: {
        height: 8,
        width: 8,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 5
    },
    activeIndicator: {
        backgroundColor: '#1E99D5',
        width: 20
    },
    button: {
        backgroundColor: '#1E99D5',
        paddingHorizontal: 60,
        paddingVertical: 15,
        borderRadius: 10,
        elevation: 5,
        minWidth: 200, // Largeur minimum pour que le bouton ne saute pas lors du changement de texte
        alignItems: 'center'
    },
    buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default Onboarding;