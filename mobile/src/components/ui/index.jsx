import { StyleSheet, Text, View } from 'react-native';

export function toneColor(tone, theme) {
  if (tone === 'gold') return theme.gold;
  if (tone === 'success') return theme.success;
  return theme.primary;
}

function alpha(hex, opacity) {
  const v = hex.replace('#','');
  const n = v.length===3 ? v.split('').map(s=>s+s).join('') : v;
  const i = parseInt(n,16);
  return `rgba(${(i>>16)&255},${(i>>8)&255},${i&255},${opacity})`;
}

export function Badge({ label, theme, tone = 'primary' }) {
  const color = toneColor(tone, theme);
  return (
    <View style={[bs.badge,{backgroundColor:alpha(color,0.14),borderColor:alpha(color,0.24)}]}>
      <Text style={[bs.label,{color}]}>{label}</Text>
    </View>
  );
}
const bs = StyleSheet.create({
  badge:{alignSelf:'flex-start',borderRadius:999,borderWidth:1,paddingHorizontal:12,paddingVertical:6},
  label:{fontSize:12,fontWeight:'700',letterSpacing:0.2},
});

export function MetricCard({ accent, label, theme, value }) {
  const color = toneColor(accent, theme);
  return (
    <View style={[ms.card,{backgroundColor:theme.surface,borderColor:theme.border,shadowColor:theme.shadow}]}>
      <View style={[ms.accent,{backgroundColor:alpha(color,0.14)}]}/>
      <Text style={[ms.value,{color:theme.text}]}>{value}</Text>
      <Text style={[ms.label,{color:theme.muted}]}>{label}</Text>
    </View>
  );
}
const ms = StyleSheet.create({
  card:{borderRadius:24,borderWidth:1,flexBasis:'48%',gap:6,minHeight:120,overflow:'hidden',padding:18,shadowOffset:{width:0,height:12},shadowOpacity:0.08,shadowRadius:22},
  accent:{borderRadius:999,height:10,marginBottom:8,width:44},
  value:{fontSize:24,fontWeight:'800'},
  label:{fontSize:13,fontWeight:'600',lineHeight:18},
});

export function ProgressBar({ color, progress, theme }) {
  return (
    <View style={[ps.track,{backgroundColor:alpha(theme.primary,0.08)}]}>
      <View style={[ps.fill,{backgroundColor:color,width:`${Math.min(progress,100)}%`}]}/>
    </View>
  );
}
const ps = StyleSheet.create({
  track:{borderRadius:999,height:10,marginTop:10,overflow:'hidden',width:'100%'},
  fill:{borderRadius:999,height:'100%'},
});

export function SectionTitle({ subtitle, theme, title }) {
  return (
    <View style={{gap:4}}>
      <Text style={{color:theme.text,fontSize:22,fontWeight:'800'}}>{title}</Text>
      <Text style={{color:theme.muted,fontSize:14,lineHeight:20}}>{subtitle}</Text>
    </View>
  );
}
