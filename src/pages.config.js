/**
 * pages.config.js - Page routing configuration
 *
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 *
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 *
 * Example file structure:
 *
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 *
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import MockExams from "./pages/MockExams";
import AITutor from "./pages/AITutor";
import Pricing from "./pages/Pricing";
import Analytics from "./pages/Analytics";
import Flashcards from "./pages/Flashcards";
import Profile from "./pages/Profile";
import AdminMembers from "./pages/AdminMembers";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import Contact from "./pages/Contact";
import Support from "./pages/Support";
import Store from "./pages/Store";
import __Layout from "./Layout.jsx";

export const PAGES = {
  Dashboard,
  Practice,
  MockExams,
  AITutor,
  Pricing,
  Analytics,
  Flashcards,
  Profile,
  AdminMembers,
  TermsOfService,
  PrivacyPolicy,
  RefundPolicy,
  Contact,
  Support,
  Store,
};

export const pagesConfig = {
  mainPage: "Dashboard",
  Pages: PAGES,
  Layout: __Layout,
};

export default pagesConfig;
