"use client";

import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";
import { Download } from "lucide-react";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1e293b" },
  header: { marginBottom: 20, borderBottom: "2px solid #2563eb", paddingBottom: 12 },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  subhead: { fontSize: 11, color: "#64748b", marginTop: 2 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#64748b" },
  value: { fontFamily: "Helvetica-Bold", color: "#0f172a" },
  valueGreen: { fontFamily: "Helvetica-Bold", color: "#16a34a" },
  valueRed: { fontFamily: "Helvetica-Bold", color: "#dc2626" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "2px solid #2563eb" },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  totalValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: 8 },
});

function fmt(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface PayslipData {
  employeeName: string;
  employeeId: string;
  companyName: string;
  month: number;
  year: number;
  baseSalary: unknown;
  totalHours?: unknown;
  adjustment?: unknown;
  bonusTotal?: unknown;
  deductionTotal?: unknown;
  socialSecurityDeduct?: unknown;
  netSalary: unknown;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function PayslipDocument({ data }: { data: PayslipData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>PayNest</Text>
          <Text style={styles.subhead}>Payslip — {MONTHS[data.month - 1]} {data.year}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Information</Text>
          <View style={styles.row}><Text style={styles.label}>Name</Text><Text style={styles.value}>{data.employeeName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Employee ID</Text><Text style={styles.value}>{data.employeeId}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Company</Text><Text style={styles.value}>{data.companyName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Period</Text><Text style={styles.value}>{MONTHS[data.month - 1]} {data.year}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          <View style={styles.row}><Text style={styles.label}>Base Salary</Text><Text style={styles.value}>{fmt(data.baseSalary)}</Text></View>
          {parseFloat(String(data.bonusTotal || 0)) > 0 && (
            <View style={styles.row}><Text style={styles.label}>Bonuses</Text><Text style={styles.valueGreen}>{fmt(data.bonusTotal)}</Text></View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deductions</Text>
          {parseFloat(String(data.deductionTotal || 0)) > 0 ? (
            <View style={styles.row}><Text style={styles.label}>Deductions</Text><Text style={styles.valueRed}>-{fmt(data.deductionTotal)}</Text></View>
          ) : (
            <View style={styles.row}><Text style={styles.label}>No deductions</Text><Text style={styles.value}>—</Text></View>
          )}
          {parseFloat(String(data.socialSecurityDeduct || 0)) > 0 && (
            <View style={styles.row}><Text style={styles.label}>Social Security</Text><Text style={styles.valueRed}>-{fmt(data.socialSecurityDeduct)}</Text></View>
          )}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Net Pay</Text>
          <Text style={styles.totalValue}>{fmt(data.netSalary)}</Text>
        </View>

        <Text style={styles.footer}>PayNest — HR & Payroll for MENA businesses · Generated {new Date().toLocaleDateString()}</Text>
      </Page>
    </Document>
  );
}

export function DownloadPayslipButton({ data, filename }: { data: PayslipData; filename: string }) {
  return (
    <PDFDownloadLink document={<PayslipDocument data={data} />} fileName={filename}>
      {({ loading }: { loading: boolean }) => (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-brand-400 hover:text-brand-700 transition-all disabled:opacity-50"
          disabled={loading}
        >
          <Download size={14} />
          {loading ? "Preparing…" : "PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
