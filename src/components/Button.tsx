import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    iconName?: string;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    variant = 'primary',
    loading = false,
    style,
    textStyle,
    disabled,
    iconName,
    ...props
}) => {
    const getBackgroundColor = () => {
        if (disabled) return '#E0E0E0';
        switch (variant) {
            case 'primary': return '#1E99D5';
            case 'secondary': return '#4FCCAE';
            case 'outline': return 'transparent';
            case 'danger': return '#FF4B4B';
            default: return '#1E99D5';
        }
    };

    const getTextColor = () => {
        if (disabled) return '#999';
        switch (variant) {
            case 'outline': return '#1E99D5';
            default: return '#FFFFFF';
        }
    };

    const getBorderColor = () => {
        if (variant === 'outline') return '#1E99D5';
        return 'transparent';
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' ? 1 : 0
                },
                style
            ]}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {iconName && (
                        <Icon name={iconName} size={20} color={getTextColor()} style={{ marginRight: 10 }} />
                    )}
                    <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    text: {
        fontWeight: 'bold',
        fontSize: 16,
    },
});
