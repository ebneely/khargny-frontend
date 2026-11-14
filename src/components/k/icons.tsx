// Lucide icons by name, as the prototype's L('name') draws them (lucide.createIcons gives the same <svg class="lucide lucide-name">).
// Only the names the screens use are imported, so the bundle does not carry the whole set.
import { Accessibility, Armchair, ArrowRight, Award, Baby, BadgeAlert, BadgeCheck, Banknote, BedDouble, Bike, BookmarkPlus, BookOpen, Briefcase, Bug, Building, Cake, Calendar, CalendarCheck, Camera, Car, Castle, Check, CheckCircle, ChefHat, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, CircleOff, CircleParking, Clapperboard, Clock, Coffee, Compass, CreditCard, Croissant, Dices, Dog, DoorClosed, DoorOpen, Ellipsis, Eye, FerrisWheel, Flag, Flame, Flower2, Footprints, Gauge, Globe, Hand, History, Image, ImagePlus, Images, Infinity, Info, Landmark, Laptop, Layers, LayoutGrid, Library, Lightbulb, ListChecks, Lock, Map, MapPin, Martini, MessageCircle, Mic, Moon, Music, Navigation, PencilLine, Phone, Plus, Receipt, RotateCcw, Route, Salad, Search, SearchX, ShieldAlert, ShieldCheck, ShoppingBag, SlidersHorizontal, Smartphone, Star, SmartphoneNfc, Sparkles, Sprout, Store, Sun, Tag, Toilet, ToyBrick, Trees, TrendingDown, TrendingUp, Trophy, Tv, User, Users, Utensils, Volleyball, Wallet, Waves, Wifi, Wine, X, type LucideIcon } from 'lucide-react';
import { strokePaths } from '@5argny/core/icons';
import { GOVERNORATES, govKey } from '@5argny/core/governorates';

const LUCIDE: Record<string, LucideIcon> = { 'accessibility': Accessibility, 'armchair': Armchair, 'arrow-right': ArrowRight, 'award': Award, 'baby': Baby, 'badge-alert': BadgeAlert, 'badge-check': BadgeCheck, 'banknote': Banknote, 'bed-double': BedDouble, 'bike': Bike, 'bookmark-plus': BookmarkPlus, 'book-open': BookOpen, 'briefcase': Briefcase, 'bug': Bug, 'building': Building, 'cake': Cake, 'calendar': Calendar, 'calendar-check': CalendarCheck, 'camera': Camera, 'car': Car, 'castle': Castle, 'check': Check, 'check-circle': CheckCircle, 'chef-hat': ChefHat, 'chevron-down': ChevronDown, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, 'circle-help': CircleHelp, 'circle-off': CircleOff, 'circle-parking': CircleParking, 'clapperboard': Clapperboard, 'clock': Clock, 'coffee': Coffee, 'compass': Compass, 'credit-card': CreditCard, 'croissant': Croissant, 'dices': Dices, 'dog': Dog, 'door-closed': DoorClosed, 'door-open': DoorOpen, 'ellipsis': Ellipsis, 'eye': Eye, 'ferris-wheel': FerrisWheel, 'flag': Flag, 'flame': Flame, 'flower-2': Flower2, 'footprints': Footprints, 'gauge': Gauge, 'globe': Globe, 'hand': Hand, 'history': History, 'image': Image, 'image-plus': ImagePlus, 'images': Images, 'infinity': Infinity, 'info': Info, 'landmark': Landmark, 'laptop': Laptop, 'layers': Layers, 'layout-grid': LayoutGrid, 'library': Library, 'lightbulb': Lightbulb, 'list-checks': ListChecks, 'lock': Lock, 'map': Map, 'map-pin': MapPin, 'martini': Martini, 'message-circle': MessageCircle, 'mic': Mic, 'moon': Moon, 'music': Music, 'navigation': Navigation, 'pencil-line': PencilLine, 'phone': Phone, 'plus': Plus, 'receipt': Receipt, 'rotate-ccw': RotateCcw, 'route': Route, 'salad': Salad, 'search': Search, 'search-x': SearchX, 'shield-alert': ShieldAlert, 'shield-check': ShieldCheck, 'shopping-bag': ShoppingBag, 'sliders-horizontal': SlidersHorizontal, 'smartphone': Smartphone, 'smartphone-nfc': SmartphoneNfc, 'sparkles': Sparkles, 'sprout': Sprout, 'star': Star, 'store': Store, 'sun': Sun, 'tag': Tag, 'toilet': Toilet, 'toy-brick': ToyBrick, 'trees': Trees, 'trending-down': TrendingDown, 'trending-up': TrendingUp, 'trophy': Trophy, 'tv': Tv, 'user': User, 'users': Users, 'utensils': Utensils, 'volleyball': Volleyball, 'wallet': Wallet, 'waves': Waves, 'wifi': Wifi, 'wine': Wine, 'x': X, 'clock-plus': Clock };

/** L(name): a lucide icon. Unknown names fall back to a tag, as the prototype's catIcons fallback does. */
export function L({ n, cls }: { n: string; cls?: string }) {
  const C = LUCIDE[n] ?? LUCIDE.tag;
  return <C className={cls} aria-hidden="true" />;
}

export type StrokeName = keyof typeof strokePaths;
/** ic(name): the prototype's own line set (tab bar, actions, stats). */
export function Ic({ n, cls }: { n: StrokeName; cls?: string }) {
  return <svg className={n === 'back' ? `${cls ?? ''} ic-back`.trim() : cls} viewBox="0 0 24 24" aria-hidden="true"><path d={strokePaths[n]} /></svg>;
}

/** govIcon(name): the governorate's landmark for a city slug or English name; the fallback when the city has none. */
export function Gov({ name, fallback }: { name: string | null | undefined; fallback: React.ReactNode }) {
  const g = GOVERNORATES[govKey(name) ?? ''];
  return g ? <svg className="gov" viewBox="0 0 24 24" aria-hidden="true"><path d={g.d} /></svg> : <>{fallback}</>;
}
