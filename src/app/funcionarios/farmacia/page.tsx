"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Pill, AlertCircle, ChevronLeft, Construction, Activity, ShieldX } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function FarmaciaPage() {
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setStatus("denied"); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();
        const allowed = data?.hasFarmaciaAccess === true || data?.role === "admin" || data?.role === "medico";
        setStatus(allowed ? "allowed" : "denied");
      } catch {
        setStatus("denied");
      }
    });
    return () => unsub();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0F0F1E] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen bg-[#0F0F1E] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-6 left-6 z-10">
          <Link href="/funcionarios" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Volver
          </Link>
        </div>
        <div className="relative z-10 max-w-md mx-auto space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-black text-white">Acceso Restringido</h1>
          <p className="text-white/50 text-base leading-relaxed">
            No tienes permiso para acceder al módulo de Farmacia.<br />
            Contacta al administrador para solicitar acceso.
          </p>
          <Link href="/funcionarios" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold px-6 py-3 rounded-xl transition-all">
            <ChevronLeft className="w-4 h-4" /> Volver al Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F1E] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-6 left-6 z-10">
        <Link href="/funcionarios" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 text-sm font-medium">
          <ChevronLeft className="w-4 h-4" /> Volver al Inicio
        </Link>
      </div>
      <div className="relative z-10 max-w-2xl mx-auto w-full space-y-8">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
          <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 w-full h-full rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 transform rotate-12 hover:rotate-0 transition-transform duration-500 cursor-pointer">
            <Pill className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest uppercase mb-2">
            <Construction className="w-3.5 h-3.5" /> En Desarrollo
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Módulo <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Farmacia</span>
          </h1>
          <p className="text-lg text-white/60 max-w-lg mx-auto leading-relaxed">
            Estamos construyendo el nuevo sistema de gestión de recetas médicas para brindar una experiencia más rápida y segura.
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="font-bold text-white">Progreso de Implementación</span>
            </div>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white">5%</span>
          </div>
          <div className="relative h-4 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 w-[5%] rounded-full shadow-[0_0_15px_rgba(52,211,153,0.6)]" />
          </div>
          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            {[
              { icon: "💊", label: "Recetas Crónicas", status: "Planificado" },
              { icon: "🔒", label: "Recetas Controladas", status: "Planificado" },
              { icon: "🔔", label: "Alertas Automáticas", status: "Planificado" },
            ].map(f => (
              <div key={f.label} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-left">
                <div className="text-xl mb-1">{f.icon}</div>
                <div className="text-white/80 text-xs font-bold">{f.label}</div>
                <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-1">{f.status}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-left">
            <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-300/80">
              Actualmente nos encontramos en la fase inicial del desarrollo. Pronto podrás gestionar recetas crónicas, controladas y recibir alertas automáticas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

