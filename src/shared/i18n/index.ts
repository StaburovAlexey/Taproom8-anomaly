import { createI18n } from 'vue-i18n'

import { readSettings } from '@/shared/config/settings'

const messages = {
  ru: {
    brand: {
      title: 'TAPROOM',
      accent: '8',
      subtitle: 'Всё не то, всё не так...',
    },
    common: {
      back: 'Назад',
      close: 'Закрыть',
      open: 'Открыть',
      enabled: 'Включено',
      disabled: 'Выключено',
    },
    loading: {
      status: 'Загрузка...',
    },
    audioGate: {
      play: 'Играть',
    },
    menu: {
      start: 'Начать',
      continue: 'Продолжить',
      settings: 'Настройки',
      about: 'О проекте',
      returnHome: 'В главное меню',
      confirmTitle: 'Покинуть игру?',
      confirmText: 'Текущий прогресс будет потерян.',
      confirm: 'Выйти',
      cancel: 'Остаться',
    },
    settings: {
      title: 'Настройки',
      language: 'Язык',
      graphics: 'Графика',
      fullscreen: 'Полный экран',
      brightness: 'Яркость',
      volume: 'Громкость',
      normal: 'Обычная',
      potato: 'Для слабых устройств',
    },
    game: {
      level: 'Наблюдение',
      objective: 'Найдите аномалию и выберите дверь',
      interact: 'E — открыть дверь',
      anomalyDoor: 'Есть аномалия',
      clearDoor: 'Нет аномалии',
    },
    interaction: {
      chooseAnomalyDoor: 'Дверь: аномалия есть',
      chooseNoAnomalyDoor: 'Дверь: аномалий нет',
      openInteractiveDoor: 'Открыть дверь',
    },
    completed: {
      eyebrow: 'ЦИКЛ ЗАВЕРШЁН',
      title: 'Вы сохранили память',
      text: 'Все десять наблюдений пройдены.',
      again: 'Начать новый цикл',
      menu: 'В главное меню',
    },
    about: {
      title: 'Прототип',
      text: 'Прототип игры о поиске аномалий в знакомом помещении.',
      controls: 'Управление',
      desktop: 'WASD — движение · мышь — обзор · E — дверь',
      mobile: 'Два стика — движение и обзор',
    },
    errors: {
      engine: 'Не удалось запустить 3D-сцену.',
      retry: 'Повторить',
    },
  },
  en: {
    brand: {
      title: 'TAPROOM',
      accent: '8',
      subtitle: 'Nothing is right, nothing is as it should be...',
    },
    common: {
      back: 'Back',
      close: 'Close',
      open: 'Open',
      enabled: 'Enabled',
      disabled: 'Disabled',
    },
    loading: {
      status: 'Loading...',
    },
    audioGate: {
      play: 'Play',
    },
    menu: {
      start: 'Begin observation',
      continue: 'Continue observation',
      settings: 'Settings',
      about: 'About',
      returnHome: 'Main menu',
      confirmTitle: 'Leave the game?',
      confirmText: 'Current progress will be lost.',
      confirm: 'Leave',
      cancel: 'Stay',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      graphics: 'Graphics',
      fullscreen: 'Fullscreen',
      brightness: 'Brightness',
      volume: 'Volume',
      normal: 'Normal',
      potato: 'Low-end devices',
    },
    game: {
      level: 'Observation',
      objective: 'Find the change and choose a door',
      interact: 'E — open door',
      anomalyDoor: 'Anomaly present',
      clearDoor: 'No anomaly',
    },
    interaction: {
      chooseAnomalyDoor: 'Door: anomaly present',
      chooseNoAnomalyDoor: 'Door: no anomaly',
      openInteractiveDoor: 'Open door',
    },
    completed: {
      eyebrow: 'CYCLE COMPLETE',
      title: 'You kept your memory',
      text: 'All ten observations are complete.',
      again: 'Start a new cycle',
      menu: 'Main menu',
    },
    about: {
      title: 'Prototype',
      text: 'A prototype anomaly-detection game set in a familiar room.',
      controls: 'Controls',
      desktop: 'WASD — move · mouse — look · E — door',
      mobile: 'Two sticks — move and look',
    },
    errors: {
      engine: 'The 3D scene could not be started.',
      retry: 'Try again',
    },
  },
} as const

export const i18n = createI18n({
  legacy: false,
  locale: readSettings().language,
  fallbackLocale: 'en',
  messages,
})
