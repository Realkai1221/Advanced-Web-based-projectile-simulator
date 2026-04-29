function mergeSort(array) {
  if (array.length <= 1) return array;

  var mid = Math.floor(array.length / 2);
  var leftArr = [];
  for (var i = 0; i < mid; i++) leftArr[leftArr.length] = array[i];
  var rightArr = [];
  for (var i = mid; i < array.length; i++) rightArr[rightArr.length] = array[i];

  return merge(mergeSort(leftArr), mergeSort(rightArr));
}

// merge two sorted halves, using <= so equal elements keep their order
function merge(left, right) {
  var result = [];
  var i = 0, j = 0;

  while (i < left.length && j < right.length) {
    if (comparePlayers(left[i], right[j]) <= 0) {
      result[result.length] = left[i]; i++;
    } else {
      result[result.length] = right[j]; j++;
    }
  }
  while (i < left.length) { result[result.length] = left[i]; i++; }
  while (j < right.length) { result[result.length] = right[j]; j++; }

  return result;
}

// most wins first, then best accuracy, then fastest time
function comparePlayers(a, b) {
  if (a.wins !== b.wins) return b.wins - a.wins;
  if (a.avgAccuracy !== b.avgAccuracy) return a.avgAccuracy - b.avgAccuracy;
  return a.fastestTime - b.fastestTime;
}
