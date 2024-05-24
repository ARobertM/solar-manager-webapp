import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from "../../assets/Colors";
import axios from 'axios';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

export default function Dashboard({ userId }) {
  const apiUrl = process.env.EXPO_PUBLIC_IPV4;
  const screenWidth = Dimensions.get("window").width;

  const [batteryData, setBatteryData] = useState(null);
  const [solarData, setSolarData] = useState(null);
  const [inverterData, setInverterData] = useState(null);
  const [batteryPercentage, setBatteryPercentage] = useState(null);

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{
      data: [],
      color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
      strokeWidth: 2
    }]
  });

  useEffect(() => {
    const verifyAndFetchData = async () => {
      try {
        console.log('Sending request with userId:', userId);
        const res = await axios.get(`https://d9a1-193-226-62-129.ngrok-free.app/api/inverter-data/${userId}`);
        console.log('Inverter data response:', res.data);
        if (res.data && res.data.inverterData) {
          console.log('Inverter found, fetching real-time data...');
          setInverterData(res.data.inverterData);
          await fetchData(res.data.inverterData);
          await fetchBatteryData(res.data.inverterData);
        } else {
          console.log('No inverter found for this user.');
          setInverterData(null);
        }
      } catch (error) {
        console.error("Verification failed:", error.response ? error.response.data : error.message);
        setInverterData(null);
      }
    };

    const fetchData = async (inverterData) => {
      if (!inverterData) {
        console.log("No inverter data to fetch");
        return;
      }
      try {
        const [batteryRes, solarRes, batPercRes] = await Promise.all([
          axios.get(`http://${apiUrl}:9000/api/influxdata-bat-last`),
          axios.get(`http://${apiUrl}:9000/api/influxdata-solp-last`),
          axios.get(`http://${apiUrl}:9000/api/influxdata-batperc-last`),
        ]);
        console.log('Battery data response:', batteryRes.data);
        console.log('Solar data response:', solarRes.data);
        console.log('Battery percentage response:', batPercRes.data);

        if (batteryRes.data) {
          setBatteryData(batteryRes.data);
        } else {
          console.log('Battery data is null');
        }

        if (solarRes.data) {
          setSolarData(solarRes.data);
        } else {
          console.log('Solar data is null');
        }

        if (batPercRes.data) {
          setBatteryPercentage(batPercRes.data);
        } else {
          console.log('Battery percentage data is null');
        }

      } catch (error) {
        console.error("Error fetching real-time data:", error);
        setBatteryData(null);
        setSolarData(null);
        setBatteryPercentage(null);
      }
    };

    const fetchBatteryData = async (inverterData) => {
      if (!inverterData) {
        console.log("No inverter data to fetch battery data");
        return;
      }
      try {
        const batteryDataRes = await axios.get(`http://${apiUrl}:9000/api/influxdata-bat`);
        const batteryData = batteryDataRes.data;
        console.log('Historical battery data response:', batteryData);
        
        if (batteryData) {
          const labels = batteryData.map(item => new Date(item._time).toLocaleDateString());
          const data = batteryData.map(item => item._value);
          setChartData({
            labels,
            datasets: [{
              data,
              color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
              strokeWidth: 2
            }]
          });
        } else {
          console.log('Historical battery data is null');
        }

      } catch (error) {
        console.error("Error fetching historical battery data:", error);
      }
    };

    verifyAndFetchData();

    const interval = setInterval(verifyAndFetchData, 10000);
    return () => clearInterval(interval);
  }, [userId, apiUrl]); // Added apiUrl to dependencies

  useEffect(() => {
    console.log('Battery Data:', batteryData);
    console.log('Solar Data:', solarData);
    console.log('Battery Percentage:', batteryPercentage);
    console.log('Inverter Data:', inverterData);
    console.log('Chart Data:', chartData);
  }, [batteryData, solarData, batteryPercentage, inverterData, chartData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[Colors.YELLOW_LIGHT, Colors.WHITE, Colors.WHITE]}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      />
      <ScrollView>
        <View style={styles.container}>
          <Text style={styles.welcomeText}>Solis</Text>
          <Text style={styles.solisText}>Dashboard</Text>
          {inverterData ? (
            <>
              <View style={styles.card}>
                <View style={styles.iconWithText}>
                  <Feather name="battery-charging" size={34} color={Colors.BLUE} />
                  <Text style={styles.batteryInfo}>
                    {batteryData ? `  Battery Voltage: ${batteryData._value} V` : "  Loading battery data..."}
                  </Text>
                </View>
                <View style={styles.iconWithText}>
                  <MaterialIcons name="solar-power" size={34} color={Colors.YELLOW_LIGHT} />
                  <Text style={styles.solarInfo}>
                    {solarData ? `  Solar Panel Voltage: ${solarData._value} V` : "  Loading solar data..."}
                  </Text>
                </View>
              </View>
              <View style={styles.textSimple}>
                <Text style={styles.solarInfo}>Inverter: {inverterData.InverterName}</Text>
              </View>

              <Text style={styles.batteryInfo2}>Battery Statistics</Text>
              <View style={styles.batteryContainer}>
                <FontAwesome name="battery-4" size={60} color={Colors.BLUE} style={styles.batteryIcon} />
                <Text style={styles.batteryText}>
                  {batteryPercentage ? `${batteryPercentage._value} %` : "Loading battery percentage..."}
                </Text>
              </View>
              {chartData.labels.length > 0 && chartData.datasets[0].data.length > 0 ? (
                <LineChart
                  data={chartData}
                  width={screenWidth - 40}
                  height={220}
                  verticalLabelRotation={30}
                  chartConfig={{
                    backgroundColor: '#e26a00',
                    backgroundGradientFrom: '#fb8c00',
                    backgroundGradientTo: '#ffa726',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: "#ffa726"
                    }
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              ) : (
                <Text style={styles.loadingText}>Loading chart data...</Text>
              )}
            </>
          ) : (
            <Text style={styles.noInverterText}>No inverter data available. Please add an inverter.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'pop-regular',
  },
  logoImage: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
  },
  fontText: {
    fontFamily: 'pop-regular',
    fontSize: 25,
  },
  fontTitle: {
    fontFamily: 'pop-semibold',
    fontSize: 40,
    marginTop: -20,
    color: Colors.YELLOW_LIGHT,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  formView: {
    width: '80%',
  },
  fontLabel: {
    marginTop : -20,
    fontFamily: 'pop-regular',
    fontSize: 20,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  signUpButton: {
    backgroundColor: Colors.YELLOW_LIGHT,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.BLUE,
    padding: 15,
    borderRadius: 5,
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'pop-semibold',
    color: 'white',
    marginLeft: 10,
  },
  createAccount: {
    marginTop: 20,
    alignItems: 'center',
  },
  createAccountText: {
    fontFamily: 'pop-regular',
    fontSize: 12,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
