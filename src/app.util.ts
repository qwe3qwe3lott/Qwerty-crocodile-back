export const getRandomArrayElement = <T, A extends Array<T>>(array: A): T | undefined  => {
	return array[Math.floor(Math.random() * array.length)];
};

export const shuffleArray = <T, A extends Array<T>>(array: A): A => {
	let currentIndex = array.length,  randomIndex: number;

	while (currentIndex > 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[ array[currentIndex], array[randomIndex] ] = [ array[randomIndex], array[currentIndex] ];
	}

	return array;
};