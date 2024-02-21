export const getRandomArrayElement = <T>(array: Array<T>): T | undefined => {
	return array[Math.floor(Math.random() * array.length)];
};

export const shuffleArray = <T>(array: Array<T>): Array<T> => {
	let currentIndex = array.length, randomIndex: number;

	while (currentIndex > 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[ array[currentIndex], array[randomIndex] ] = [ array[randomIndex], array[currentIndex] ];
	}

	return array;
};
