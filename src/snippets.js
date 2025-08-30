export const defaultSnippets = {
    javascript: `function main() {
    console.log("Hello, World!");
}

main();`,

    python: `def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()`,

    java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,

    c: `#include <stdio.h>

    int main() {
        printf("Hello, World!\\n");
        return 0;
    }`,

    cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,

    csharp: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}`,

    typescript: `function main(): void {
    console.log("Hello, World!");
}

main();`,

    php: `<?php
echo "Hello, World!";
?>`,

    go: `package main
import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,

    rust: `fn main() {
    println!("Hello, World!");
}`,

    sql: `SELECT 'Hello, World!' AS greeting;`,
};
