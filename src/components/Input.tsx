import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, TouchableOpacity, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIconName?: string;
    rightIconName?: string;
    onRightIconPress?: () => void;
    isPassword?: boolean;
    containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    style,
    leftIconName,
    rightIconName,
    onRightIconPress,
    isPassword,
    secureTextEntry,
    containerStyle,
    ...props
}) => {
    const [isSecure, setIsSecure] = useState(secureTextEntry);

    const toggleSecure = () => {
        setIsSecure(!isSecure);
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
                {leftIconName && (
                    <Icon name={leftIconName} size={20} color="#666" style={styles.leftIcon} />
                )}
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor="#999"
                    secureTextEntry={isPassword ? isSecure : secureTextEntry}
                    {...props}
                />
                {isPassword ? (
                    <TouchableOpacity onPress={toggleSecure} style={styles.rightIcon}>
                        <Icon name={isSecure ? "eye-off" : "eye"} size={20} color="#666" />
                    </TouchableOpacity>
                ) : rightIconName ? (
                    <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
                        <Icon name={rightIconName} size={20} color="#666" />
                    </TouchableOpacity>
                ) : null}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    input: {
        flex: 1,
        padding: 15,
        color: '#000',
    },
    leftIcon: {
        marginLeft: 15,
    },
    rightIcon: {
        padding: 10,
        marginRight: 5,
    },
    inputError: {
        borderColor: '#FF4B4B',
    },
    errorText: {
        color: '#FF4B4B',
        fontSize: 12,
        marginTop: 5,
    },
});
