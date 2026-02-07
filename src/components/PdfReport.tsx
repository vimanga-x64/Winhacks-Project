import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register a standard font (optional, but good for consistency)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v1/1.ttf' }, // Fallback or standard
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v1/2.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
  },
  text: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#444',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: '#888',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 10,
    color: '#222',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  gridItem: {
    width: '33%',
    marginBottom: 10,
  },
  recommendationBox: {
    backgroundColor: '#fff1f2', // Light red/pink bg
    padding: 15,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    marginTop: 20,
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 5,
  },
  recommendationText: {
    fontSize: 10,
    color: '#7f1d1d',
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#aaa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  }
});

interface PdfReportProps {
  userStats: any;
  metrics: any;
  gainEntries: any[];
  lostEntries: any[];
  recommendation: string | null;
  date: string;
}

const PdfReport: React.FC<PdfReportProps> = ({ userStats, metrics, gainEntries, lostEntries, recommendation, date }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
            <Text style={styles.title}>FITTRACK</Text>
            <Text style={styles.subtitle}>Daily Health Analysis</Text>
        </View>
        <Text style={styles.subtitle}>{date}</Text>
      </View>

      {/* User Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Profile</Text>
        <View style={styles.grid}>
            <View style={styles.gridItem}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{userStats.name}</Text>
            </View>
            <View style={styles.gridItem}>
                <Text style={styles.label}>Age / Gender</Text>
                <Text style={styles.value}>{userStats.age} / {userStats.gender}</Text>
            </View>
            <View style={styles.gridItem}>
                <Text style={styles.label}>Weight</Text>
                <Text style={styles.value}>{userStats.weight} kg</Text>
            </View>
             <View style={styles.gridItem}>
                <Text style={styles.label}>Height</Text>
                <Text style={styles.value}>{userStats.height} cm</Text>
            </View>
            <View style={styles.gridItem}>
                <Text style={styles.label}>Goal</Text>
                <Text style={styles.value}>{userStats.fitnessGoal}</Text>
            </View>
             <View style={styles.gridItem}>
                <Text style={styles.label}>Activity Level</Text>
                <Text style={styles.value}>{userStats.activityLevel}</Text>
            </View>
        </View>
      </View>

      {/* Metrics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.grid}>
             <View style={styles.gridItem}>
                <Text style={styles.label}>BMI</Text>
                <Text style={styles.value}>{metrics.bmi}</Text>
            </View>
            <View style={styles.gridItem}>
                <Text style={styles.label}>BMR</Text>
                <Text style={styles.value}>{metrics.bmr} kcal</Text>
            </View>
             <View style={styles.gridItem}>
                <Text style={styles.label}>TDEE</Text>
                <Text style={styles.value}>{metrics.tdee} kcal</Text>
            </View>
            <View style={styles.gridItem}>
                <Text style={styles.label}>Daily Calorie Goal</Text>
                <Text style={{...styles.value, color: '#ef4444', fontWeight: 'bold'}}>{metrics.calorieGoal} kcal</Text>
            </View>
        </View>
      </View>

      {/* Consumption Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Log</Text>
        
        <View style={{flexDirection: 'row'}}>
            <View style={{width: '50%', paddingRight: 10}}>
                <Text style={{fontSize: 11, fontWeight: 'bold', marginBottom: 5}}>Intake</Text>
                {gainEntries.filter(e => e.input && e.calories).map((entry, i) => (
                    <View key={i} style={styles.row}>
                        <Text style={{fontSize: 10, width: '70%'}}>{entry.input}</Text>
                        <Text style={{fontSize: 10, fontWeight: 'bold'}}>+{entry.calories}</Text>
                    </View>
                ))}
                {gainEntries.filter(e => e.input && e.calories).length === 0 && <Text style={{fontSize: 10, color: '#999'}}>No food recorded</Text>}
            </View>

            <View style={{width: '50%', paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#eee'}}>
                <Text style={{fontSize: 11, fontWeight: 'bold', marginBottom: 5}}>Activity</Text>
                {lostEntries.filter(e => e.activity && e.calories).map((entry, i) => (
                    <View key={i} style={styles.row}>
                        <Text style={{fontSize: 10, width: '70%'}}>{entry.activity} ({entry.duration})</Text>
                        <Text style={{fontSize: 10, fontWeight: 'bold'}}>-{entry.calories}</Text>
                    </View>
                ))}
                 {lostEntries.filter(e => e.activity && e.calories).length === 0 && <Text style={{fontSize: 10, color: '#999'}}>No activity recorded</Text>}
            </View>
        </View>
      </View>

      {/* AI Analysis Section */}
      {recommendation && (
        <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>AI Analysis & Recommendation</Text>
            <Text style={styles.recommendationText}>{recommendation}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Generated by FitTrack AI • Keep pushing towards your goals!
      </Text>

    </Page>
  </Document>
);

export default PdfReport;
