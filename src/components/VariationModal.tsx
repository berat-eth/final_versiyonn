import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { ProductVariation, ProductVariationOption, Product } from '../utils/types';
import { Colors } from '../theme/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface VariationModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (selectedOptions: { [key: string]: ProductVariationOption }) => void;
  selectedOptions: { [key: string]: ProductVariationOption };
}

const { width } = Dimensions.get('window');

export const VariationModal: React.FC<VariationModalProps> = ({
  visible,
  product,
  onClose,
  onConfirm,
  selectedOptions,
}) => {
  const [localSelectedOptions, setLocalSelectedOptions] = useState<{ [key: string]: ProductVariationOption }>(selectedOptions);

  useEffect(() => {
    setLocalSelectedOptions(selectedOptions);
  }, [selectedOptions, visible]);

  const handleOptionSelect = (variation: ProductVariation, option: ProductVariationOption) => {
    const newSelectedOptions = {
      ...localSelectedOptions,
      [variation.name]: option,
    };
    
    setLocalSelectedOptions(newSelectedOptions);
  };

  const isOptionSelected = (variationName: string, option: ProductVariationOption) => {
    return localSelectedOptions[variationName]?.id === option.id;
  };

  const isOptionAvailable = (option: ProductVariationOption) => {
    return option.stock > 0;
  };

  const isAllVariationsSelected = () => {
    if (!product?.variations || product.variations.length === 0) return true;
    
    return product.variations.every(variation => 
      localSelectedOptions[variation.name] && localSelectedOptions[variation.name].id
    );
  };

  const getTotalPriceModifier = () => {
    return Object.values(localSelectedOptions).reduce((total, option) => {
      return total + (option?.priceModifier || 0);
    }, 0);
  };

  const handleConfirm = () => {
    if (!isAllVariationsSelected()) {
      Alert.alert(
        'Beden Seçimi Gerekli', 
        'Lütfen tüm varyasyonları seçin.',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }
    
    onConfirm(localSelectedOptions);
    onClose();
  };

  const handleClose = () => {
    setLocalSelectedOptions(selectedOptions); // Reset to original selection
    onClose();
  };

  if (!product || !product.variations || product.variations.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Beden Seçimi</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <Image 
              source={{ uri: product.images?.[0] || product.image }} 
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.productDetails}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.productPrice}>
                {product.price.toFixed(0)} TL
                {getTotalPriceModifier() > 0 && (
                  <Text style={styles.priceModifier}>
                    {' '}(+{getTotalPriceModifier().toFixed(0)} TL)
                  </Text>
                )}
              </Text>
            </View>
          </View>

          {/* Variations */}
          <ScrollView style={styles.variationsContainer} showsVerticalScrollIndicator={false}>
            {product.variations.map((variation) => (
              <View key={variation.id} style={styles.variationContainer}>
                <Text style={styles.variationName}>{variation.name}</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.optionsContainer}
                >
                  {variation.options.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionButton,
                        isOptionSelected(variation.name, option) && styles.selectedOption,
                        !isOptionAvailable(option) && styles.unavailableOption,
                      ]}
                      onPress={() => handleOptionSelect(variation, option)}
                      disabled={!isOptionAvailable(option)}
                    >
                      {option.image && (
                        <Image 
                          source={{ uri: option.image }} 
                          style={styles.optionImage}
                          resizeMode="cover"
                        />
                      )}
                      <Text style={[
                        styles.optionText,
                        isOptionSelected(variation.name, option) && styles.selectedOptionText,
                        !isOptionAvailable(option) && styles.unavailableOptionText,
                      ]}>
                        {option.value}
                      </Text>
                      <Text style={[
                        styles.stockText,
                        !isOptionAvailable(option) && styles.unavailableStockText,
                      ]}>
                        {option.stock > 0 ? `${option.stock} adet` : 'Tükendi'}
                      </Text>
                      {option.priceModifier > 0 && (
                        <Text style={[
                          styles.priceModifier,
                          isOptionSelected(variation.name, option) && styles.selectedPriceModifier,
                        ]}>
                          +{option.priceModifier.toFixed(0)}₺
                        </Text>
                      )}
                      {option.stock <= 5 && option.stock > 0 && (
                        <Text style={styles.lowStockBadge}>Son {option.stock}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
          </ScrollView>

          {/* Selected Summary */}
          {Object.keys(localSelectedOptions).length > 0 && (
            <View style={styles.selectedSummary}>
              <Text style={styles.selectedTitle}>Seçilen Varyasyonlar:</Text>
              {Object.entries(localSelectedOptions).map(([variationId, option]) => (
                <View key={variationId} style={styles.selectedItem}>
                  <Text style={styles.selectedLabel}>
                    {product.variations?.find(v => v.name === variationId)?.name}:
                  </Text>
                  <Text style={styles.selectedValue}>
                    {option.value}
                    {option.priceModifier > 0 && (
                      <Text style={styles.selectedPriceModifier}>
                        {' '}(+{option.priceModifier.toFixed(0)} TL)
                      </Text>
                    )}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                !isAllVariationsSelected() && styles.confirmButtonDisabled
              ]} 
              onPress={handleConfirm}
              disabled={!isAllVariationsSelected()}
            >
              <Text style={[
                styles.confirmButtonText,
                !isAllVariationsSelected() && styles.confirmButtonTextDisabled
              ]}>
                Sepete Ekle
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  productInfo: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  priceModifier: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  variationsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  variationContainer: {
    marginVertical: 16,
  },
  variationName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
  },
  optionButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  selectedOption: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E8',
  },
  unavailableOption: {
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  optionImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  unavailableOptionText: {
    color: '#999999',
  },
  stockText: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
    textAlign: 'center',
  },
  unavailableStockText: {
    color: '#F44336',
    fontWeight: '500',
  },
  priceModifier: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  selectedPriceModifier: {
    color: Colors.primary,
    fontWeight: '600',
  },
  lowStockBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF9800',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedSummary: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  selectedValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  selectedPriceModifier: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmButtonTextDisabled: {
    color: '#999999',
  },
});
