import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext();
const LS_KEY = 'mesh_language';

function getBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'de';
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const matched = browserLanguages.find(lang => String(lang).toLowerCase().startsWith('en') || String(lang).toLowerCase().startsWith('de'));
  return matched?.toLowerCase().startsWith('en') ? 'en' : 'de';
}

export const translations = {
  de: {
    common: {
      language: 'Sprache',
      german: 'Deutsch',
      english: 'English',
      login: 'Login',
      signIn: 'Anmelden',
      logout: 'Abmelden',
      imprint: 'Impressum',
      about: 'Hilfe',
      nodes: 'Nodes',
      settings: 'Einstellungen',
      refresh: 'Aktualisieren',
      close: 'Schließen',
      screenshot: 'Screenshot',
      zoom: 'Zum Vergrößern klicken',
      sent: 'gesendet',
      received: 'empfangen',
      admin: 'Admin',
    },
    theme: {
      light: 'Hell',
      dark: 'Dunkel',
      auto: 'Auto',
      title: 'Design',
      dayOn: 'Tag einschalten',
      nightOn: 'Nacht einschalten',
    },
    dashboard: {
      networkFallback: 'Web ↔ MQTT ↔ Meshtastic-Netzwerk',
      loadingReceiveTitle: 'Empfang beim Seitenladen läuft',
      loadingReceiveText: 'Manueller Empfang ist danach wieder nutzbar.',
      settings: 'Einstellungen',
      manualReceive: 'Manueller Empfang',
      sendMessage: 'Nachricht senden',
      messageHistory: 'Nachrichtenverlauf',
      pollLog: 'Poll-Log',
    },
    footer: {
      about: 'Hilfe',
    },
    landing: {
      badge: 'Meshtastic MQTT Web Portal',
      title: 'Meshtastic Web Portal — Meshtastic direkt im Browser.',
      intro: 'Das Meshtastic Web Portal macht jeden Webbrowser zum virtuellen Meshtastic-Node. Über MQTT verbindet es sich in Echtzeit mit Ihrem Meshtastic-Netzwerk — auch ohne eigenes Funkgerät.',
      proxyIntroPrefix: 'In Kombination mit dem',
      proxyIntroSuffix: 'können Nachrichten gesendet, empfangen, geroutet, an Personen weitergeleitet, in Gruppen umgeleitet, dedupliziert und Zustellbestätigungen verfolgt werden.',
      capabilitiesTitle: 'Leistungsbereiche',
      capabilitiesText: 'Von MQTT-Integration über virtuelle Web-Nodes bis zu ACK-Tracking, Deduplizierung und Benachrichtigungen.',
      robustTitle: 'Technisch robust, intuitiv bedienbar',
      robustText: 'Eine moderne, webbasierte Brücke zwischen Meshtastic — prinzipiell auch Meshcore — MQTT und alltäglicher Kommunikation: skalierbar, flexibel und ohne Gerätezwang. Nodes, Kanäle, Direktnachrichten, GPS/Karte, Akku, SNR und Zustellstatus werden zentral sichtbar.',
      topics: [
        ['MQTT als Nervensystem', 'Das Portal kann Meshtastic-Geräte entfernter und unerschlossener Gebiete außerhalb der direkten Funkreichweite erreichen. Ganze Regionen lassen sich über Internetstrecken per MQTT überbrücken; entfernte Nodes — auch Nichtmitglieder — werden über „Tunnel” angebunden.'],
        ['Virtueller Meshtastic-Node', 'Das Portal kann als virtueller Meshtastic-Node genutzt werden. Nutzer ohne eigenes Gerät erhalten Pseudo-Node-IDs wie ?1234563. Diese IDs werden intern geroutet. So erreichen sich Webuser untereinander, sie erreichen „echte” Geräte und werden von echten Geräten erreicht.'],
        ['Nachrichten & Deduplizierung', 'Da z.B. Gruppennachrichten über viele physische Geräte an unterschiedlichen Orten gleichzeitig verschickt werden, erhöht sich die Empfangsquote dramatisch. Regelmäßig mehrfach eintreffende Nachrichten werden dedupliziert und nur 1x im Portal angezeigt.'],
        ['ACK & Zustellstatus', 'Mit want_ack und eindeutigen client_ref-IDs verfolgt das Portal ACK, NAK und Implicit ACK über dedizierte MQTT-Topics transparent nach.'],
        ['Node-Entdeckung', 'Node-Daten wie last_heard, SNR, battery_level, GPS, Hardware und Uptime werden per MQTT-Polling gesammelt und übersichtlich visualisiert.'],
        ['Omni-Channel-Erweiterung', 'E-Mail-Weiterleitung ist bereits möglich; Versand per E-Mail sowie SMS, RCS, Push, Telegram, WhatsApp, iMessage, KI-Bots und Autoresponder sind vorbereitet oder machbar.'],
      ],
      screenshots: [
        ['Nachrichtenübersicht', 'Eingehende Nachrichten, Gruppen und DM via Radio oder Portal — dedupliziert, wenn sie über mehrere Wege geleitet werden.'],
        ['Nachrichten versenden', 'Bequem senden mit oder ohne ACK-Anforderung, mehr Hops, gleichzeitiger Portal-Zustellung oder Weiterleitung an Accounts mit E-Mail-, SMS- und RCS-Anbindung.'],
        ['Automatischer Hintergrundbetrieb', 'Nachrichtenempfang auch im Hintergrund ohne angemeldete Nutzer, automatische Aktualisierung der Nodes und Dokumentation aller Vorgänge im Poll-Log.'],
        ['Mehrsprachige Oberfläche', 'In Deutsch und Englisch umgesetzt: Inhalte, Hilfetexte und Funktionsbeschreibungen sind mehrsprachig verfügbar.'],
        ['Alle Einstellungen auf einer Seite', 'In 5 Minuten eingerichtet: Topic-Prefix, Region, Kanäle, Weiterleitung und E-Mail-Benachrichtigungen zentral konfigurieren — für die eigene Instanz.'],
        ['Kompaktes responsives Design', 'Passend für PC, Mac und Linux, aber auch für Tablets und Smartphones optimiert — als App installierbar.'],
        ['Node Übersicht', 'Jeder kann grundsätzlich an alle Nodes des Netzwerks senden und nutzt dazu das Endgerät / Radio des Teilnehmers mit der besten Erreichbarkeit — in Gruppen auch mehrere.'],
        ['Kartenansicht', 'Eine Kartenansicht darf nicht fehlen: intelligente Filterung und Distanzmessung zeigen eigene und globale Nodes des Netzwerkes.'],
        ['Statistiken', 'Das Dashboard für Statistik lässt sich konfigurieren und zeigt eigene sowie Netzwerk-Statistiken übersichtlich an.'],
      ],
    },
    about: {
      title: 'Hilfe',
      introTitle: 'Was ist das?',
      intro: 'Dies ist ein web-basiertes MQTT-Dashboard für das Meshtastic-Mesh-Netzwerk. Es ermöglicht das Senden und Empfangen von Textnachrichten über das Meshtastic-Funknetz direkt im Browser — ohne dass ein physisches Meshtastic-Gerät am Computer angeschlossen sein muss.',
      howTitle: 'Wie funktioniert es?',
      how: 'Meshtastic-Nodes mit aktiviertem MQTT-Uplink veröffentlichen Nachrichten an einen MQTT-Broker. Ein JSON-Proxy übersetzt zwischen Meshtastics nativem Protobuf-Format und JSON. Diese App verbindet sich mit dem Broker, liest und schreibt diese JSON-Nachrichten und agiert dadurch als virtueller Node im Mesh.',
      featuresTitle: 'Funktionen',
      setupTitle: 'Schnelle Einrichtung',
      proxyTitle: 'MQTT JSON Proxy',
      requirementsTitle: 'Voraussetzungen',
      dashboardTitle: 'Dashboard-Übersicht',
      important: 'Wichtig:',
      recommended: 'Empfohlener Proxy:',
      defaultTopic: 'Standard-Topic-Struktur:',
      features: [
        ['Channel- & DM-Nachrichten', 'Sende Textnachrichten an Gruppenkanäle (0–7) oder direkt an bestimmte Nodes per DM. Bei DMs wird die Nachricht zusätzlich sofort als „VIA PORTAL:“ an den Empfänger gesendet — falls dieser per Web liest, sieht er sie sofort ohne MQTT-Umweg.'],
        ['Empfang & Auto-Poll', 'Empfange Nachrichten manuell vom Broker oder lasse Auto-Poll neue Nachrichten beim Laden der Seite, bei Tab-Fokus und alle 2 Minuten abrufen.'],
        ['Live-Aktualisierung', 'Neue eingehende Nachrichten erscheinen sofort per Live-Abonnement — ohne manuelles Aktualisieren.'],
        ['ACK-Tracking', 'Fordere Zustellbestätigungen (ACK/NAK/Implicit ACK) mit konfigurierbarer Hop-Begrenzung an.'],
        ['Node-Verzeichnis', 'Rufe alle bekannten Nodes ab und durchsuchen sie mit Akku, SNR, RSSI, GPS-Position, Uptime und Hardware-Informationen.'],
        ['Flexible MQTT-Topics', 'Konfiguriere eigene Topic-Prefixes, Regionen (EU_868, US usw.) und Kanalnamen.'],
        ['Benutzerspezifische Einstellungen', 'Jeder Nutzer hat eigene Node-ID, Region, Standardkanal, Kanalnamen und Topic-Prefix.'],
        ['Hell / Dunkel / Auto', 'Wechsle zwischen hellem Design, dunklem Design oder Auto-Modus nach Systemeinstellung. Die Auswahl wird gespeichert.'],
        ['Manuelle Poll-Steuerung', 'Wähle die Empfangsdauer (10s bis 20min) beim manuellen Polling — nützlich für längere Monitoring-Sitzungen.'],
      ],
      setup: [
        'Öffne die Einstellungen über das Zahnrad im Dashboard-Header.',
        'Trage deine Node-ID ein, z. B. !49b65bc8.',
        'Wähle die Region passend zur Meshtastic-Firmware-Konfiguration.',
        'Optional: setze einen eigenen Topic-Prefix, falls dein Proxy keinen Standardpfad nutzt.',
        'Benenne deine Kanäle (0–7) passend zur Meshtastic-Kanalkonfiguration.',
        'Speichern — danach kannst du Nachrichten senden und empfangen.',
      ],
      proxyImportant: 'Diese App benötigt einen JSON-Proxy, der Meshtastics native Protobuf-codierte MQTT-Nachrichten in JSON übersetzt. Der Proxy läuft neben deinem MQTT-Broker und stellt die lesbaren Topics bereit, die dieses Dashboard abonniert.',
      proxyRecommended: 'ewerker/mqtt-proxy ist die bevorzugte geräteseitige Software für dieses Dashboard. Sie läuft auf allen wichtigen Desktop- und Server-Betriebssystemen (Linux, macOS, Windows, BSD) und kann auf Raspberry Pi, NAS, VPS oder jedem Always-On-System zusammen mit dem MQTT-Broker betrieben werden.',
      requirements: [
        'Eine laufende ewerker/mqtt-proxy-Instanz (lokal oder remote).',
        'Mindestens ein Meshtastic-Node mit aktiviertem MQTT-Uplink als Gateway.',
        'Zugriff auf den MQTT-Broker, auf den dein Gateway-Node veröffentlicht.',
        'Broker-Zugangsdaten (URL, Benutzername, Passwort), die vom App-Administrator konfiguriert wurden.',
      ],
      dashboard: [
        ['Nachricht senden', 'Wähle zwischen Channel-Modus (Broadcast an eine Gruppe) oder DM-Modus (direkt an einen Node). Setze Hop-Limit und ACK-Wunsch. Bei DMs wird die Nachricht über MQTT und gleichzeitig per Portal mit Präfix VIA PORTAL: direkt an den Empfänger gesendet, sofern dieser eine konfigurierte Node-ID hat.'],
        ['Manueller Empfang', 'Höre für eine frei wählbare Dauer aktiv am Broker mit. Nützlich für längeres Monitoring.'],
        ['Nachrichtenverlauf', 'Zeigt alle gesendeten und empfangenen Nachrichten mit Richtung, Kanalinfo, SNR/RSSI, Gateway-ID und relativer Zeit. Nachrichten können einzeln gelöscht werden.'],
        ['Nodes-Seite', 'Ruft die vollständige Node-Liste vom Broker ab und zeigt Hardware, Akku, Signalqualität, GPS-Koordinaten und Uptime in einer sortierbaren Tabelle.'],
      ],
    },
  },
  en: {
    common: {
      language: 'Language',
      german: 'Deutsch',
      english: 'English',
      login: 'Login',
      signIn: 'Sign in',
      logout: 'Sign out',
      imprint: 'Imprint',
      about: 'Help',
      nodes: 'Nodes',
      settings: 'Settings',
      refresh: 'Refresh',
      close: 'Close',
      screenshot: 'Screenshot',
      zoom: 'Click to enlarge',
      sent: 'sent',
      received: 'received',
      admin: 'Admin',
    },
    theme: {
      light: 'Light',
      dark: 'Dark',
      auto: 'Auto',
      title: 'Theme',
      dayOn: 'Turn on light mode',
      nightOn: 'Turn on dark mode',
    },
    dashboard: {
      networkFallback: 'Web ↔ MQTT ↔ Meshtastic Network',
      loadingReceiveTitle: 'Receiving on page load',
      loadingReceiveText: 'Manual receive will be available again afterwards.',
      settings: 'Settings',
      manualReceive: 'Manual Receive',
      sendMessage: 'Send Message',
      messageHistory: 'Message History',
      pollLog: 'Poll Log',
    },
    footer: {
      about: 'Help',
    },
    landing: {
      badge: 'Meshtastic MQTT Web Portal',
      title: 'Meshtastic Web Portal — Meshtastic directly in your browser.',
      intro: 'The Meshtastic Web Portal turns every browser into a virtual Meshtastic node. Via MQTT it connects to your Meshtastic network in real time — even without your own radio device.',
      proxyIntroPrefix: 'Together with the',
      proxyIntroSuffix: 'messages can be sent, received, routed, forwarded to people, redirected into groups, deduplicated, and tracked with delivery confirmations.',
      capabilitiesTitle: 'Core capabilities',
      capabilitiesText: 'From MQTT integration and virtual web nodes to ACK tracking, deduplication, and notifications.',
      robustTitle: 'Technically robust, intuitive to use',
      robustText: 'A modern web-based bridge between Meshtastic — and conceptually Meshcore as well — MQTT and everyday communication: scalable, flexible, and not tied to a physical device. Nodes, channels, direct messages, GPS/map, battery, SNR, and delivery status become centrally visible.',
      topics: [
        ['MQTT as the nervous system', 'The portal can reach Meshtastic devices in remote and underserved areas outside direct radio range. Whole regions can be bridged over internet links via MQTT; remote nodes — including non-members — are connected through “tunnels”.'],
        ['Virtual Meshtastic node', 'The portal can be used as a virtual Meshtastic node. Users without their own device receive pseudo node IDs such as ?1234563. These IDs are routed internally, so web users can reach each other, reach “real” devices, and be reached by real devices.'],
        ['Messages & deduplication', 'Because group messages, for example, can be sent through many physical devices in different locations at the same time, the reception rate increases dramatically. Messages that regularly arrive multiple times are deduplicated and shown only once in the portal.'],
        ['ACK & delivery status', 'With want_ack and unique client_ref IDs, the portal transparently tracks ACK, NAK, and implicit ACK via dedicated MQTT topics.'],
        ['Node discovery', 'Node data such as last_heard, SNR, battery_level, GPS, hardware, and uptime is collected via MQTT polling and displayed clearly.'],
        ['Omni-channel extension', 'Email forwarding is already possible; sending via email as well as SMS, RCS, push, Telegram, WhatsApp, iMessage, AI bots, and autoresponders is prepared or feasible.'],
      ],
      screenshots: [
        ['Message overview', 'Incoming messages, groups, and DMs via radio or portal — deduplicated when routed through multiple paths.'],
        ['Send messages', 'Convenient sending with or without ACK requests, more hops, simultaneous portal delivery, or forwarding to accounts with email, SMS, and RCS integration.'],
        ['Automatic background operation', 'Message reception in the background without signed-in users, automatic node updates, and documentation of all operations in the poll log.'],
        ['Multilingual interface', 'Implemented in German and English: content, help texts, and feature descriptions are available in multiple languages.'],
        ['All settings on one page', 'Set up in 5 minutes: configure topic prefix, region, channels, forwarding, and email notifications centrally for your own instance.'],
        ['Compact responsive design', 'Suitable for PC, Mac, and Linux, and optimized for tablets and smartphones — installable as an app.'],
        ['Node overview', 'Everyone can generally send to all nodes in the network and uses the participant device/radio with the best reachability — in groups even multiple ones.'],
        ['Map view', 'A map view is essential: intelligent filtering and distance measurement show local and global nodes in the network.'],
        ['Statistics', 'The statistics dashboard can be configured and clearly displays personal and network-wide statistics.'],
      ],
    },
    about: {
      title: 'Help',
      introTitle: 'What is this?',
      intro: 'This is a web-based MQTT dashboard for the Meshtastic mesh network. It allows you to send and receive text messages to and from the Meshtastic radio mesh directly from your browser — without needing a physical Meshtastic device connected to your computer.',
      howTitle: 'How does it work?',
      how: 'Meshtastic nodes with MQTT uplink enabled publish messages to an MQTT broker. A JSON proxy translates between Meshtastic’s native Protobuf format and JSON. This app connects to the broker to read and write those JSON messages — acting as a virtual node on the mesh.',
      featuresTitle: 'Features',
      setupTitle: 'Quick Setup',
      proxyTitle: 'MQTT JSON Proxy',
      requirementsTitle: 'Requirements',
      dashboardTitle: 'Dashboard Overview',
      important: 'Important:',
      recommended: 'Recommended proxy:',
      defaultTopic: 'Default topic structure:',
      features: [
        ['Channel & DM Messages', 'Send text messages to group channels (0–7) or directly to specific nodes via DM mode. For DMs, the message is additionally sent immediately as “VIA PORTAL:” to the recipient — if they read via web, they see it instantly without the MQTT detour.'],
        ['Receive & Auto-Poll', 'Manually poll the broker or let auto-poll fetch new messages on page load, tab focus, and every 2 minutes.'],
        ['Real-time Updates', 'New incoming messages appear instantly via live subscriptions — no manual refresh needed.'],
        ['ACK Tracking', 'Request delivery acknowledgements (ACK/NAK/Implicit ACK) with configurable hop limits.'],
        ['Node Directory', 'Fetch and browse all known nodes — with battery, SNR, RSSI, GPS position, uptime, and hardware info.'],
        ['Flexible MQTT Topics', 'Configure custom topic prefixes, regions (EU_868, US, etc.), and per-channel names.'],
        ['Per-User Settings', 'Each user has their own Node ID, region, default channel, channel names, and topic prefix.'],
        ['Dark / Light / Auto Theme', 'Switch between dark mode, light mode, or auto mode following your system preference. The choice is saved.'],
        ['Manual Poll Control', 'Choose the listen duration (10s to 20min) when manually polling — useful for longer monitoring sessions.'],
      ],
      setup: [
        'Open Settings using the gear icon in the dashboard header.',
        'Enter your Node ID, e.g. !49b65bc8.',
        'Set the correct region matching your Meshtastic firmware configuration.',
        'Optionally set a custom topic prefix if your proxy uses a non-standard path.',
        'Name your channels (0–7) to match your Meshtastic channel configuration.',
        'Save — you are ready to send and receive messages.',
      ],
      proxyImportant: 'This app requires a JSON proxy that translates Meshtastic’s native Protobuf-encoded MQTT messages into JSON. The proxy runs alongside your MQTT broker and provides the readable topics this dashboard subscribes to.',
      proxyRecommended: 'ewerker/mqtt-proxy is the preferred device-side software for this dashboard. It runs on all major desktop and server operating systems (Linux, macOS, Windows, BSD), so you can deploy it on a Raspberry Pi, NAS, VPS, or any always-on machine alongside your MQTT broker.',
      requirements: [
        'A running ewerker/mqtt-proxy instance (local or remote).',
        'At least one Meshtastic node with MQTT uplink enabled, acting as a gateway.',
        'Access to the MQTT broker your gateway node publishes to.',
        'Broker credentials (URL, username, password) configured by the app administrator.',
      ],
      dashboard: [
        ['Send Message', 'Choose between channel mode (broadcast to a group) or DM mode (direct to a specific node). Set hop limit and ACK preference. For DMs, the message is sent via MQTT and simultaneously delivered via the portal with the prefix VIA PORTAL: directly to the recipient if they have a configured node ID.'],
        ['Manual Receive', 'Actively listen on the broker for a configurable duration. Useful for extended monitoring.'],
        ['Message History', 'Shows all sent and received messages with direction indicators, channel info, SNR/RSSI data, gateway ID, and relative timestamps. Messages can be deleted individually.'],
        ['Nodes page', 'Fetches the full node list from the broker and displays hardware, battery, signal quality, GPS coordinates, and uptime in a sortable table.'],
      ],
    },
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const savedLanguage = localStorage.getItem(LS_KEY);
    return savedLanguage || getBrowserLanguage();
  });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage);
    localStorage.setItem(LS_KEY, nextLanguage);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: translations[language],
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}