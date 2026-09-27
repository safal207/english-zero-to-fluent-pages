// A new situation for the last step of each ten-minute session.
// These are speaking prompts, not model answers or automatic assessments.
const cues = {
  'a0-1': {
    instruction: 'К тебе подошла новая соседка. Назови своё имя и город, затем узнай её имя.',
    partner: 'Hi! I am Mia. Nice to meet you.'
  },
  'a0-2': {
    instruction: 'По телефону собеседник не понял, какое слово ты сказал. Произнеси ship и sheep так, чтобы он различил их.',
    partner: 'Did you say ship or sheep?'
  },
  'a0-3': {
    instruction: 'Гость оставил книгу рядом с твоим телефоном. Покажи, какая вещь его, а какая твоя.',
    partner: 'Is this my book?'
  },
  'a0-4': {
    instruction: 'Друг уточняет время праздника. Назови время словами, затем скажи, сколько лет тебе исполняется.',
    partner: 'What time is the party?'
  },
  'a0-5': {
    instruction: 'Ты забыл ручку в библиотеке. Попроси её у сотрудника и поблагодари.',
    partner: 'Hello. Can I help you?'
  },
  'a0-6': {
    instruction: 'На вокзале ты не расслышал номер платформы. Попроси повторить его помедленнее.',
    partner: 'Your train leaves from platform seven.'
  },
  'a1-1': {
    instruction: 'Коллега спрашивает о воскресенье. Сравни, что ты обычно делаешь утром и что делаешь по воскресеньям.',
    partner: 'Do you work on Sundays?'
  },
  'a1-2': {
    instruction: 'Ты пришёл в новый клуб. Спроси сотрудника, когда он открывается и чем там занимаются.',
    partner: 'Welcome to our club!'
  },
  'a1-3': {
    instruction: 'В кафе закончились сэндвичи. Закажи другое блюдо и напиток, затем уточни цену.',
    partner: `Sorry, we're out of sandwiches. Would you like soup?`
  },
  'a1-4': {
    instruction: 'Турист ищет парк от станции. Объясни, где парк относительно станции и магазина.',
    partner: 'Excuse me, is there a park near the station?'
  },
  'a1-5': {
    instruction: 'Ты обычно работаешь дома, но сегодня едешь на автобусе. Объясни разницу между привычкой и тем, что происходит сейчас.',
    partner: 'Are you working from home today?'
  },
  'a1-6': {
    instruction: 'Новичок зовёт тебя играть в теннис. Скажи, умеешь ли ты играть, и предложи занятие, которое любишь.',
    partner: 'Can you play tennis with us?'
  },
  'a2-1': {
    instruction: 'В очереди собеседник упомянул новую книгу. Отреагируй, добавь личную деталь и задай встречный вопрос.',
    partner: 'I just bought a book about cities.'
  },
  'a2-2': {
    instruction: 'Коллега пропустил вчерашнюю поездку. Расскажи по порядку два события и одну неожиданность.',
    partner: 'How was the trip yesterday?'
  },
  'a2-3': {
    instruction: 'Друг занят в пятницу. Предложи встречу в субботу, назови время и место.',
    partner: `I can't meet on Friday. Are you free on Saturday?`
  },
  'a2-4': {
    instruction: 'В кафе тебе принесли чужой заказ. Вежливо объясни ошибку и попроси заменить блюдо.',
    partner: 'Is everything all right with your order?'
  },
  'a2-5': {
    instruction: 'Помоги другу выбрать квартиру: одна ближе к работе, другая дешевле. Сравни и объясни свой выбор.',
    partner: 'Which flat should I rent?'
  },
  'a2-6': {
    instruction: 'Собеседник спросил о поездке в Казань. Скажи, был ли ты там; если да, когда и что понравилось, если нет — задай вопрос о его опыте.',
    partner: 'Have you ever been to Kazan?'
  },
  'b1-1': {
    instruction: 'Ты спешил на поезд и потерял билет. Расскажи, что происходило, что случилось и чем всё закончилось.',
    partner: 'What happened on your way to the station?'
  },
  'b1-2': {
    instruction: 'Друг думает купить абонемент в спортзал. Назови довод за, довод против и условие, при котором ты бы его посоветовал.',
    partner: 'Is a gym membership worth it?'
  },
  'b1-3': {
    instruction: 'Знакомый плохо спит после ночных смен. Дай совет и отдельно назови то, что он обязан соблюдать для безопасности.',
    partner: 'I sleep poorly after my night shifts. What should I do?'
  },
  'b1-4': {
    instruction: 'Перед прогулкой у друга спустило колесо велосипеда. Предложи план, если его починят, и запасной вариант.',
    partner: 'The bike has a flat tyre. What will we do?'
  },
  'b1-5': {
    instruction: 'После переезда магазины оказались далеко. Сравни, как ты покупал продукты раньше и как привык делать это сейчас.',
    partner: 'Has moving changed how you shop?'
  },
  'b1-6': {
    instruction: 'Друг записался на первый марафон. Отреагируй на новость, уточни одну деталь и задай открытый вопрос.',
    partner: `I've signed up for my first marathon.`
  },
  'b2-1': {
    instruction: 'Представь неделю без интернета. Объясни, как изменились бы работа и общение, и что оказалось бы самым трудным.',
    partner: 'How would your routine change without internet for a week?'
  },
  'b2-2': {
    instruction: 'Команда выпустила продукт позже срока. Назови одно раннее решение, которое изменил бы, и возможный результат.',
    partner: 'What would you have changed about our launch?'
  },
  'b2-3': {
    instruction: 'Коллега хочет объявить, что продажи удвоились, но ты заметил ошибку в отчёте. Уточни данные без обвинений и предложи проверку.',
    partner: 'The dashboard says sales doubled. Can we announce it?'
  },
  'b2-4': {
    instruction: 'Обсуди запрет телефонов на уроках: назови два эффекта, важное ограничение и собственный вывод.',
    partner: 'Should schools ban phones during lessons?'
  },
  'b2-5': {
    instruction: 'Клиент ждёт готовую версию завтра, но проверка займёт ещё два дня. Уточни, что ему нужно в первую очередь, и предложи этапы.',
    partner: 'Can you send the final version tomorrow?'
  },
  'b2-6': {
    instruction: 'Посылка не пришла вовремя. Назови две возможные причины, степень уверенности и первый шаг проверки.',
    partner: `The parcel hasn't arrived. What could have happened?`
  },
  'c1-1': {
    instruction: 'Коллега предлагает убрать проверку доступности ради срока. Признай ограничение по времени, объясни риск и предложи рабочий компромисс.',
    partner: `Let's skip accessibility checks to ship faster.`
  },
  'c1-2': {
    instruction: 'Один клиент похвалил функцию, а команда говорит, что она понравится всем. Отдели наблюдение от вывода и назови недостающие данные.',
    partner: 'One customer loved the feature. Is that proof everyone will?'
  },
  'c1-3': {
    instruction: 'Откажись выступать на следующей неделе: сначала другу, затем официальному организатору. Сохрани смысл, но измени стиль.',
    partner: 'Could you speak at our event next week?'
  },
  'c1-4': {
    instruction: 'Команда спорит о цвете кнопки, но форма недоступна с клавиатуры. Переведи обсуждение на главное и обоснуй приоритет.',
    partner: 'Which button colour should we choose?'
  },
  'c1-5': {
    instruction: 'Менеджер просит пересказать осторожный вывод врача о ночных сменах. Передай позицию врача без усиления и отдели своё мнение.',
    partner: 'What did the doctor actually say about the new schedule?'
  },
  'c1-6': {
    instruction: 'Без подготовки обсуди пешеходный центр города: дай краткий ответ, конкретный пример, оговорку и вернись к вопросу.',
    partner: 'Should the city centre become car-free?'
  },
  'c2-1': {
    instruction: 'После предложения директор сказал «обсудим позже». Назови минимум два возможных намерения и какой контекст помог бы их различить.',
    partner: `The director said, "We can discuss it later." Is that a refusal?`
  },
  'c2-2': {
    instruction: 'После одного успешного теста коллега называет сервис надёжным. Различи «работает сейчас», «надёжен» и «устойчив к сбоям».',
    partner: 'Can we call this service reliable after one successful test?'
  },
  'c2-3': {
    instruction: 'Одна оценка реформы показывает рост баллов, другая — падение посещаемости. Сопоставь показатели и дай осторожный общий вывод.',
    partner: 'One study reports higher scores, another lower attendance. How would you reconcile them?'
  },
  'c2-4': {
    instruction: 'Собеседник требует выбрать между немедленным и идеальным релизом. Переформулируй спор через приемлемые риски и предложи третий путь.',
    partner: 'Must we launch now or wait until everything is perfect?'
  },
  'c2-5': {
    instruction: 'Объяви горожанам о закрытии моста за 30 секунд: выдели паузами три важных факта и честно назови то, что пока неизвестно.',
    partner: 'How would you announce the bridge closure clearly?'
  },
  'c2-6': {
    instruction: 'На защите решения эксперт возражает тебе. Сначала перескажи возражение, затем уточни свой вывод и попроси проверить слабое место.',
    partner: 'Your recommendation conflicts with the experts. Why should we trust it?'
  }
};

export function transferCue(lesson) {
  return cues[lesson?.id] ?? null;
}
