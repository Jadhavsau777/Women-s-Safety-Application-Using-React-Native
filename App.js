import React, { useState, useEffect } from 'react';
import { View, Alert, Linking, StyleSheet, TouchableOpacity, Modal, Text, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { keepAwake } from 'expo-keep-awake';

const HAZARD_MODE_TASK = 'hazard-mode-task';

TaskManager.defineTask(HAZARD_MODE_TASK, () => {
  // This task runs in the background
  return BackgroundFetch.Result.NewData;
});

export default function App() {
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hazardMode, setHazardMode] = useState(false);
  const [volumePressCount, setVolumePressCount] = useState(0);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
      await getCurrentLocation();

      if (hazardMode) {
        // Register the background task when hazard mode is enabled
        BackgroundFetch.registerTaskAsync(HAZARD_MODE_TASK, {
          minimumInterval: 15 * 60, // Minimum interval in seconds
        });

        keepAwake(); // Keep the app awake when hazard mode is enabled
      } else {
        // Unregister the background task when hazard mode is disabled
        BackgroundFetch.unregisterTaskAsync(HAZARD_MODE_TASK);
      }
    })();
  }, [hazardMode]);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setMapRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      Alert.alert("Error", "Unable to get your current location");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeedDial = () => {
    const phoneNumber = 'tel:9021429392';
    Linking.openURL(phoneNumber).catch(err => Alert.alert("Failed to dial", err.message));
  };

  const handleShareLocation = async () => {
    await getCurrentLocation();
    if (!location) {
      Alert.alert("Location Error", "Unable to get your current location");
      return;
    }

    const message = `Here is my current location: https://www.google.com/maps/?q=${location.coords.latitude},${location.coords.longitude}`;
    const isAvailable = await SMS.isAvailableAsync();

    if (isAvailable) {
      await SMS.sendSMSAsync(['9021429392'], message);
    } else {
      Alert.alert("SMS Error", "SMS service is not available");
    }
  };

  const handleSOS = async () => {
    await getCurrentLocation();
    if (!location) {
      Alert.alert("Location Error", "Unable to get your current location");
      return;
    }

    const sosMessage = `SOS! I need immediate assistance. Please help! My current location: https://www.google.com/maps/?q=${location.coords.latitude},${location.coords.longitude}`;
    const phoneNumber = 'sms:9021429392?body=' + encodeURIComponent(sosMessage);
    Linking.openURL(phoneNumber).catch(err => Alert.alert("Failed to send SOS", err.message));
  };

  const handleLocateMe = async () => {
    await getCurrentLocation();
    if (location) {
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005, // Zoom level for closer view
        longitudeDelta: 0.005, // Zoom level for closer view
      });
    }
  };

  const toggleHazardMode = () => {
    setHazardMode(!hazardMode);
    Alert.alert("Hazard Mode", `Hazard mode is now ${hazardMode ? 'OFF' : 'ON'}`);
  };

  const handleVolumePress = () => {
    setVolumePressCount(prevCount => prevCount + 1);
    if (volumePressCount >= 4) {
      Alert.alert("Emergency Call", "Calling 1234...");
      Linking.openURL('tel:1234');
      setVolumePressCount(0); // Reset the counter after calling
    }
  };

  const handleModalOption = (option) => {
    setModalVisible(false);
    switch (option) {
      case 'Settings':
        Alert.alert("Settings", "Settings option selected");
        break;
      case 'Help Me':
        Alert.alert("Help Me", "Help Me option selected");
        break;
      case 'Contact Us':
        Alert.alert("Contact Us", "Contact Us option selected");
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Text style={styles.navbarTitle}>Your Safety</Text>
        <TouchableOpacity style={styles.hazardButton} onPress={toggleHazardMode}>
          <Icon name="warning-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title={"You are here"}
          />
        )}
      </MapView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleSpeedDial}>
          <Icon name="person-outline" size={20} color="#fff" />
          <Text style={styles.buttonLabel}>Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleShareLocation}>
          <Icon name="location-outline" size={20} color="#fff" />
          <Text style={styles.buttonLabel}>Share Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleSOS}>
          <Icon name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.buttonLabel}>SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLocateMe}>
          <Icon name="compass-outline" size={20} color="#fff" />
          <Text style={styles.buttonLabel}>Locate Me</Text>
        </TouchableOpacity>
      </View>

      {/* Hazard Switch remains below the buttons */}
      <View style={styles.hazardContainer}>
        <Text style={styles.hazardLabel}>Hazard Mode:</Text>
        <Switch
          value={hazardMode}
          onValueChange={toggleHazardMode}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={hazardMode ? "#f5dd4b" : "#f4f3f4"}
        />
      </View>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setModalVisible(true)}
      >
        <Icon name="settings" size={30} color="#fff" />
      </TouchableOpacity>

      {loading && <ActivityIndicator style={styles.loadingIndicator} size="large" color="#0000ff" />}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => handleModalOption('Help Me')}>
              <Text style={styles.modalOption}>Help Me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleModalOption('Contact Us')}>
              <Text style={styles.modalOption}>Contact Us</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleModalOption('Settings')}>
              <Text style={styles.modalOption}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#6A5ACD',
  },
  navbarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  hazardButton: {
    padding: 10,
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#fff',
    elevation: 5,
  },
  button: {
    flex: 1,
    marginHorizontal: 2,
    padding: 5,
    borderRadius: 8,
    backgroundColor: '#6A5ACD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonLabel: {
    color: '#fff',
    marginTop: 5,
  },
  hazardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  hazardLabel: {
    fontSize: 16,
  },
 settingsButton: {
  position: 'absolute',
  left: 20, // Position it to the left
  top: '50%', // Center it vertically
  transform: [{ translateY: -25 }], // Adjust for half the button's height
  backgroundColor: '#6A5ACD',
  borderRadius: 50,
  padding: 10,
  elevation: 5,
},
settingsButton: {
  position: 'absolute',
  left: 20, // Position it to the left
  top: '50%', // Center it vertically
  transform: [{ translateY: -25 }], // Adjust for half the button's height
  backgroundColor: '#6A5ACD',
  borderRadius: 50,
  padding: 10,
  elevation: 5,
},

  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOption: {
    paddingVertical: 10,
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#6A5ACD',
    borderRadius: 5,
    padding: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});



