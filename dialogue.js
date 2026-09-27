import {transferCue} from './transfer.js';

// The third partner turn continues the new situation from transfer.js.
// These are prompts for spoken practice, not model answers or assessments.
const followups = {
  'a0-1': {partner: 'Where do you live now?', instruction: 'Ответь Мии, где ты сейчас живёшь, и задай такой же вопрос.'},
  'a0-2': {partner: 'Thanks. Can you say thank you slowly?', instruction: 'Произнеси thank you медленно и разборчиво.'},
  'a0-3': {partner: 'And is this your phone?', instruction: 'Покажи, чей телефон, коротким ответом.'},
  'a0-4': {partner: 'Great! Is the party today?', instruction: 'Скажи, сегодня праздник или в другой день.'},
  'a0-5': {partner: 'Here is a pen. Anything else?', instruction: 'Поблагодари и скажи, нужно ли тебе что-то ещё.'},
  'a0-6': {partner: 'Platform seven. Did you get that?', instruction: 'Подтверди номер платформы или попроси повторить ещё раз.'},
  'a1-1': {partner: 'What do you do on Sunday afternoons?', instruction: 'Расскажи, что обычно делаешь после обеда в воскресенье.'},
  'a1-2': {partner: 'We open at ten. What would you like to do?', instruction: 'Скажи, чем хочешь заняться в клубе.'},
  'a1-3': {partner: 'The soup is six pounds. Would you like a drink?', instruction: 'Выбери напиток и подтверди заказ.'},
  'a1-4': {partner: 'Is it behind the shop?', instruction: 'Уточни, где находится парк по отношению к магазину.'},
  'a1-5': {partner: 'Do you take the bus every day?', instruction: 'Отличи сегодняшнюю поездку от своей обычной привычки.'},
  'a1-6': {partner: 'That sounds fun. When do you do it?', instruction: 'Назови время, когда обычно занимаешься любимым делом.'},
  'a2-1': {partner: 'What kind of books do you usually read?', instruction: 'Ответь с личной деталью и задай встречный вопрос.'},
  'a2-2': {partner: 'What surprised you most?', instruction: 'Выдели один неожиданный момент вчерашней поездки.'},
  'a2-3': {partner: 'Saturday works. Where shall we meet?', instruction: 'Предложи место встречи и уточни, удобно ли собеседнику.'},
  'a2-4': {partner: 'I am sorry. Would you like us to replace it?', instruction: 'Подтверди, что хочешь заменить блюдо, и уточни какое.'},
  'a2-5': {partner: 'Would you still choose it if the rent went up?', instruction: 'Пересмотри свой выбор с учётом нового условия.'},
  'a2-6': {partner: 'What would you like to do there?', instruction: 'Назови занятие в Казани, которое тебе было бы интересно.'},
  'b1-1': {partner: 'How did you solve the ticket problem?', instruction: 'Объясни, что сделал после потери билета и чем всё закончилось.'},
  'b1-2': {partner: 'What if I can only go once a week?', instruction: 'Измени совет с учётом того, что друг может ходить только раз в неделю.'},
  'b1-3': {partner: 'What could I change before my next shift?', instruction: 'Предложи один конкретный шаг перед следующей ночной сменой.'},
  'b1-4': {partner: 'The repair shop is closed. What is our backup plan?', instruction: 'Предложи запасной план для прогулки, если велосипед не починить.'},
  'b1-5': {partner: 'Is your new routine better for you?', instruction: 'Оцени новую привычку и назови её плюс и минус.'},
  'b1-6': {partner: 'What worries me most is staying motivated.', instruction: 'Поддержи друга и задай вопрос о его подготовке к марафону.'},
  'b2-1': {partner: 'Would a week offline help you focus?', instruction: 'Взвесь пользу и неудобства недели без интернета.'},
  'b2-2': {partner: 'Could we have seen the delay coming?', instruction: 'Назови ранний сигнал и объясни, как он мог изменить решение.'},
  'b2-3': {partner: 'Which number should we verify first?', instruction: 'Назови показатель для первой проверки и объясни почему.'},
  'b2-4': {partner: 'How would you make the rule fair?', instruction: 'Предложи условие, которое сделает запрет телефонов справедливее.'},
  'b2-5': {partner: 'A draft tomorrow would help. What will be missing?', instruction: 'Чётко назови, что войдёт в черновик завтра и что появится позже.'},
  'b2-6': {partner: 'When should we contact the delivery company?', instruction: 'Предложи срок обращения, учитывая степень уверенности в причине задержки.'},
  'c1-1': {partner: 'Which accessibility checks are essential before release?', instruction: 'Обозначь обязательный минимум проверок и обоснуй выбор.'},
  'c1-2': {partner: 'What evidence would justify a broader claim?', instruction: 'Назови данные, которые позволили бы обобщить отзыв клиента.'},
  'c1-3': {partner: 'Could you suggest another speaker instead?', instruction: 'Ответь организатору в уместном официальном стиле и предложи замену, если можешь.'},
  'c1-4': {partner: 'Can we decide on the colour after fixing that?', instruction: 'Согласуй порядок решения двух задач без обесценивания первой идеи.'},
  'c1-5': {partner: 'How certain was the doctor about that risk?', instruction: 'Передай степень уверенности врача и отдельно своё отношение.'},
  'c1-6': {partner: 'What would change your conclusion?', instruction: 'Назови условие, при котором ты изменил бы вывод о пешеходном центре.'},
  'c2-1': {partner: 'Would you ask what the director meant?', instruction: 'Предложи тактичный уточняющий вопрос без приписывания намерений.'},
  'c2-2': {partner: 'What evidence would make reliable the right word?', instruction: 'Сформулируй критерии, после которых слово reliable будет оправданным.'},
  'c2-3': {partner: 'Which missing detail would most affect your conclusion?', instruction: 'Выбери одно недостающее сведение и объясни его влияние на вывод.'},
  'c2-4': {partner: 'Who should decide which risks are acceptable?', instruction: 'Свяжи предложенный третий путь с тем, кто несёт последствия решения.'},
  'c2-5': {partner: 'What should residents do if plans change?', instruction: 'Заверши объявление понятным способом получить обновления.'},
  'c2-6': {partner: 'What finding would make you revise your recommendation?', instruction: 'Назови проверяемое свидетельство, которое изменило бы твой вывод.'}
};

export function dialogueFor(lesson) {
  if (!lesson || typeof lesson.partner !== 'string' || typeof lesson.speaking !== 'string') return null;
  const second = transferCue(lesson);
  const third = followups[lesson.id];
  if (!second || !third) return null;
  return [
    {partner: lesson.partner, instruction: lesson.speaking},
    {partner: second.partner, instruction: second.instruction},
    {partner: third.partner, instruction: third.instruction}
  ];
}
